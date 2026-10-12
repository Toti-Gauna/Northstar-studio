"use client";
import {
  activeQuestions,
  type BriefInput,
  type Service,
} from "@northstar/contracts";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { useAction, useApi, useApp } from "../components/providers";
import { request } from "../lib/api";
export function useBriefFlow() {
  const { me, t, locale, switchRole } = useApp(),
    params = useSearchParams(),
    services = useApi<{ items: Service[] }>("/public/services"),
    draft = useApi<{ data: Partial<BriefInput> | null }>("/me/brief-draft"),
    action = useAction();
  const form = useForm<BriefInput>({
    defaultValues: {
      title: "",
      name: "",
      email: "",
      serviceId: "",
      packageId: "essential",
      quantity100: 100,
      addonIds: [],
      answers: {},
      source: "website",
      channel: "public-web",
      campaign: "",
      attachmentIds: [],
      currency: me!.brand.currency,
    },
  });
  const { watch, setValue, getValues, reset, trigger } = form;
  const values = watch(),
    [loaded, setLoaded] = useState(false),
    [step, setStep] = useState(0),
    [direction, setDirection] = useState("forward"),
    [saved, setSaved] = useState(false),
    [receipt, setReceipt] = useState<{ id: string; reference: string } | null>(
      null,
    ),
    [pendingService, setPendingService] = useState<Service | null>(null),
    [files, setFiles] = useState<{ id: string; filename: string }[]>([]),
    stepRef = useRef<HTMLHeadingElement>(null),
    savePromise = useRef<Promise<unknown> | null>(null),
    submitted = useRef(false),
    submissionKey = useRef({ key: "", payload: "" }),
    savingController = useRef<AbortController | null>(null),
    saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const service = services.data?.items.find((s) => s.id === values.serviceId);
  const pkg = service?.data.packages.find((p) => p.id === values.packageId);
  const questions = service
    ? activeQuestions(service.data, values.answers || {})
    : [];
  useEffect(() => {
    if (loaded || !services.data || !draft.data) return;
    const data = draft.data.data;
    const selected =
      services.data.items.find(
        (s) => s.id === (data?.serviceId || params.get("service")),
      ) || services.data.items[0];
    if (!selected) return;
    reset({
      ...getValues(),
      ...data,
      serviceId: selected.id,
      packageId: selected.data.packages.some(
        (p) => p.id === (data?.packageId || params.get("package")),
      )
        ? data?.packageId || params.get("package")!
        : selected.data.packages[0].id,
      currency: me!.brand.currency,
      attachmentIds: data?.attachmentIds || [],
    });
    setLoaded(true);
  }, [services.data, draft.data, loaded, params, reset, getValues, me]);
  useEffect(() => {
    if (!loaded || receipt) return;
    const sub = watch((data) => {
      setSaved(false);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (submitted.current) return;
        savingController.current?.abort();
        const controller = new AbortController();
        savingController.current = controller;
        const payload = {
          ...data,
          ...(!data.deadline ? { deadline: undefined } : {}),
        };
        savePromise.current = request(
          "/me/brief-draft",
          "PUT",
          payload,
          controller.signal,
        )
          .then(() => {
            if (!submitted.current) setSaved(true);
          })
          .catch(() => {});
      }, 900);
    });
    return () => {
      sub.unsubscribe();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      savingController.current?.abort();
    };
  }, [loaded, receipt, watch]);
  // Autosave is server-scoped; no brief PII is stored in browser persistence.
  useEffect(() => {
    if (!service) return;
    const active = new Set(questions.map((q) => q.id));
    for (const key of Object.keys(values.answers || {}))
      if (!active.has(key)) form.unregister(`answers.${key}`);
  }, [service, values.answers, form, questions.map((q) => q.id).join("|")]);
  useEffect(() => {
    if (loaded) stepRef.current?.focus();
  }, [step, loaded]);
  const estimateInput = {
    serviceId: values.serviceId,
    packageId: values.packageId,
    quantity100: values.quantity100,
    addonIds: values.addonIds,
    currency: me!.brand.currency,
  };
  const estimate = useQuery<any>({
    queryKey: [me!.workspaceId, me!.userId, "estimate", estimateInput],
    queryFn: ({ signal }) =>
      request("/estimates", "POST", estimateInput, signal),
    enabled: loaded && !!service && !!pkg,
  });
  const changeService = (next: Service) => {
    const old = service;
    const compatible = Object.fromEntries(
      Object.entries(getValues("answers") || {}).filter(([id]) => {
        const before = old?.data.questions.find((q) => q.id === id),
          after = next.data.questions.find((q) => q.id === id);
        return (
          before &&
          after &&
          before.type === after.type &&
          before.label.en === after.label.en
        );
      }),
    );
    setValue("serviceId", next.id);
    setValue("packageId", next.data.packages[0].id);
    setValue("addonIds", []);
    setValue("answers", compatible);
    setPendingService(null);
  };
  const selectService = (id: string) => {
    const next = services.data!.items.find((s) => s.id === id)!;
    const incompatible = Object.keys(values.answers || {}).some((id) => {
      const before = service?.data.questions.find((q) => q.id === id),
        after = next.data.questions.find((q) => q.id === id);
      return (
        values.answers[id] && (!after || after.label.en !== before?.label.en)
      );
    });
    if (incompatible) setPendingService(next);
    else changeService(next);
  };
  const advance = async () => {
    const fields: FieldPath<BriefInput>[] =
      step === 0
        ? ["serviceId", "packageId", "quantity100"]
        : [
            "title",
            "name",
            "email",
            ...questions.map((q) => `answers.${q.id}` as FieldPath<BriefInput>),
          ];
    if (await trigger(fields, { shouldFocus: true })) {
      setDirection("forward");
      setStep(step + 1);
    }
  };
  const attach = async (file: File) => {
    const data = new FormData();
    data.append("file", file);
    const result = await action.run(
      () =>
        request<{ id: string; filename: string }>("/attachments", "POST", data),
      t.saved,
    );
    if (result) {
      setFiles((f) => [...f, result]);
      setValue("attachmentIds", [...getValues("attachmentIds"), result.id]);
    }
  };
  const submit = async () => {
    if (!(await trigger(undefined, { shouldFocus: true }))) return;
    submitted.current = true;
    await savePromise.current;
    const body = {
      ...getValues(),
      answers: Object.fromEntries(
        questions.map((q) => [q.id, getValues(`answers.${q.id}`) || ""]),
      ),
      ...(getValues("deadline") ? {} : { deadline: undefined }),
    };
    const payload = JSON.stringify(body);
    if (submissionKey.current.payload !== payload)
      submissionKey.current = { key: crypto.randomUUID(), payload };
    const result = await action.run(() =>
      request<{ id: string; reference: string }>("/leads", "POST", {
        ...body,
        __key: submissionKey.current.key,
      }),
    );
    if (result) setReceipt(result);
    else submitted.current = false;
  };
  return {
    me,
    t,
    locale,
    switchRole,
    services,
    draft,
    action,
    form,
    values,
    loaded,
    step,
    direction,
    saved,
    receipt,
    pendingService,
    files,
    stepRef,
    estimate,
    pkg,
    questions,
    service,
    changeService,
    selectService,
    advance,
    attach,
    submit,
    setStep,
    setDirection,
    setPendingService,
  };
}
export type BriefFlow = ReturnType<typeof useBriefFlow>;

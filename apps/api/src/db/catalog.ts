import {
  serviceSchema,
  type Copy,
  type Profile,
  type ServiceData,
} from "@northstar/contracts";
const c = (en: string, es: string): Copy => ({ en, es });
const definitions: Record<
  Profile,
  {
    names: Copy[];
    summaries: Copy[];
    unit: Copy;
    question: Copy;
    deliverables: Copy[];
    stages: Copy[];
  }
> = {
  digital: {
    names: [
      c("Brand & direction", "Marca y dirección"),
      c("Web & experience", "Web y experiencia"),
      c("Systems & workflow", "Sistemas y procesos"),
    ],
    summaries: [
      c(
        "A considered identity, built around what you do.",
        "Una identidad pensada alrededor de lo que hacés.",
      ),
      c(
        "A purposeful website, from first impression to next action.",
        "Una web con propósito, desde la primera impresión a la siguiente acción.",
      ),
      c(
        "Connect the daily work that keeps your business moving.",
        "Conectá el trabajo diario que mueve tu negocio.",
      ),
    ],
    unit: c("workstream", "línea de trabajo"),
    question: c(
      "Which platforms or materials already exist?",
      "¿Qué plataformas o materiales ya existen?",
    ),
    deliverables: [
      c("Direction & concept", "Dirección y concepto"),
      c("Production-ready deliverables", "Entregables listos para implementar"),
      c("Documented handoff", "Entrega documentada"),
    ],
    stages: [
      c("Discovery", "Descubrimiento"),
      c("Design & build", "Diseño y construcción"),
      c("Review & handoff", "Revisión y entrega"),
    ],
  },
  architecture: {
    names: [
      c("Feasibility & concept", "Viabilidad y concepto"),
      c("Design development", "Desarrollo del diseño"),
      c("Site coordination", "Coordinación de obra"),
    ],
    summaries: [
      c(
        "Turn constraints and possibilities into a clear spatial brief.",
        "Convertí condiciones y posibilidades en un brief espacial claro.",
      ),
      c(
        "Develop a coordinated design with explicit decisions.",
        "Desarrollá un diseño coordinado con decisiones explícitas.",
      ),
      c(
        "A structured record of visits, questions and decisions.",
        "Un registro ordenado de visitas, consultas y decisiones.",
      ),
    ],
    unit: c("defined zone", "zona definida"),
    question: c(
      "What is the site area and existing condition?",
      "¿Cuál es la superficie y el estado actual?",
    ),
    deliverables: [
      c("Concept drawings", "Planos conceptuales"),
      c("Coordinated drawing set", "Juego de planos coordinados"),
      c("Design decision register", "Registro de decisiones de diseño"),
    ],
    stages: [
      c("Site & brief", "Sitio y brief"),
      c("Design development", "Desarrollo del diseño"),
      c("Review & documentation", "Revisión y documentación"),
    ],
  },
  technical: {
    names: [
      c("Assessment & diagnostics", "Evaluación y diagnóstico"),
      c("Installation planning", "Planificación de instalación"),
      c("Maintenance program", "Programa de mantenimiento"),
    ],
    summaries: [
      c(
        "Understand the equipment, conditions and work required.",
        "Conocé equipos, condiciones y trabajos necesarios.",
      ),
      c(
        "Define the installation scope before work begins.",
        "Definí el alcance de instalación antes de comenzar.",
      ),
      c(
        "A practical plan for inspections and ongoing care.",
        "Un plan práctico de inspecciones y mantenimiento.",
      ),
    ],
    unit: c("asset group", "grupo de activos"),
    question: c(
      "Which equipment and access conditions apply?",
      "¿Qué equipos y condiciones de acceso aplican?",
    ),
    deliverables: [
      c("Assessment report", "Informe de evaluación"),
      c("Work and safety plan", "Plan de trabajo y seguridad"),
      c("Inspection checklist", "Lista de inspección"),
    ],
    stages: [
      c("Assessment", "Evaluación"),
      c("Planning & execution", "Planificación y ejecución"),
      c("Inspection & handoff", "Inspección y entrega"),
    ],
  },
};
export function catalog(profile: Profile): ServiceData[] {
  const d = definitions[profile];
  return d.names.map((name, i) =>
    serviceSchema.parse({
      name,
      summary: d.summaries[i],
      description: c(
        "A collaborative service with explicit scope, practical milestones and a clear review process. Choose a starting package; the final proposal is reviewed by an operator.",
        "Un servicio colaborativo con alcance explícito, hitos prácticos y revisión clara. Elegí un paquete inicial; el operador revisará la propuesta final.",
      ),
      profile,
      unit: d.unit,
      packages: [
        c("Essential", "Esencial"),
        c("Considered", "Integral"),
        c("Extended", "Ampliado"),
      ].map((n, p) => ({
        id: ["essential", "considered", "extended"][p],
        name: n,
        prices: {
          USD: [180000, 320000, 540000][p] + i * 30000,
          ARS: [210000000, 380000000, 620000000][p] / 10 + i * 3000000,
        },
        days: [14, 28, 42][p],
        revisions: p + 1,
        included: d.deliverables.slice(0, p + 1),
        excluded: [
          c(
            "Third-party fees and ongoing operations",
            "Costos de terceros y operación continua",
          ),
          c(
            "Work outside the agreed scope",
            "Trabajos fuera del alcance acordado",
          ),
        ],
      })),
      questions: [
        {
          id: "goal",
          label: c(
            "What should this work make possible?",
            "¿Qué debería permitir este trabajo?",
          ),
          type: "text",
          required: true,
          hint: c(
            "A concrete goal helps us define acceptance criteria.",
            "Un objetivo concreto permite definir criterios de aceptación.",
          ),
        },
        {
          id: "existing",
          label: d.question,
          type: "text",
          required: true,
          hint: c(
            "Existing materials help us define the starting point.",
            "Los materiales existentes permiten definir el punto de partida.",
          ),
        },
        {
          id: "coordination",
          label: c(
            "Does another team need to be involved?",
            "¿Debe participar otro equipo?",
          ),
          type: "select",
          options: [c("No", "No"), c("Yes", "Sí")],
          required: true,
          hint: c(
            "Coordination affects scope and timing.",
            "La coordinación afecta alcance y plazos.",
          ),
        },
        {
          id: "team",
          label: c(
            "Which team and who approves the work?",
            "¿Qué equipo participa y quién aprueba el trabajo?",
          ),
          type: "text",
          required: true,
          when: { field: "coordination", equals: "Yes" },
          hint: c(
            "Naming an approver reduces review ambiguity.",
            "Identificar a quien aprueba aclara la revisión.",
          ),
        },
      ],
      addons: [
        {
          id: "workshop",
          name: c("Scoping workshop", "Taller de alcance"),
          prices: { USD: 45000, ARS: 5500000 },
        },
        {
          id: "documentation",
          name: c("Extended documentation", "Documentación ampliada"),
          prices: { USD: 30000, ARS: 4000000 },
        },
      ],
      milestones: d.stages.map((title, p) => ({
        title,
        tasks: [
          {
            title:
              p === 0
                ? c(
                    "Provide materials and constraints",
                    "Aportar materiales y condiciones",
                  )
                : c(
                    "Review and consolidate feedback",
                    "Revisar y consolidar comentarios",
                  ),
            owner: "customer",
          },
          {
            title:
              p === 0
                ? c(
                    "Validate scope and define the work plan",
                    "Validar alcance y definir el plan de trabajo",
                  )
                : p === 1
                  ? c(
                      "Produce the agreed deliverables",
                      "Producir los entregables acordados",
                    )
                  : c(
                      "Verify acceptance criteria and document the handoff",
                      "Verificar criterios de aceptación y documentar la entrega",
                    ),
            owner: "operator",
          },
        ],
      })),
    }),
  );
}
export function sampleCases(profile: Profile) {
  return [0, 1].map((i) => ({
    profile,
    title:
      i === 0
        ? c(
            "From an open question to a clear scope",
            "De una pregunta abierta a un alcance claro",
          )
        : c(
            "A handoff everyone can follow",
            "Una entrega que todos pueden seguir",
          ),
    summary: c(
      "A synthetic scenario showing how a brief becomes a reviewed proposal and a structured project.",
      "Un escenario sintético que muestra cómo un brief se convierte en una propuesta revisada y un proyecto ordenado.",
    ),
    challenge: c(
      "The request starts with incomplete information and unclear responsibilities.",
      "La solicitud comienza con información incompleta y responsabilidades poco claras.",
    ),
    approach: c(
      "Conditional questions, package comparison and a reviewed scope provide a shared reference.",
      "Preguntas condicionales, comparación de paquetes y alcance revisado brindan una referencia compartida.",
    ),
    tag: c("Demonstration case", "Caso de demostración"),
  }));
}
export function sampleFaq(profile: Profile) {
  return [
    {
      profile,
      question: c(
        "Is the estimate a final quote?",
        "¿La estimación es un presupuesto final?",
      ),
      answer: c(
        "No. It is a transparent starting estimate from the catalog. An operator reviews your brief and sends a proposal with a defined scope.",
        "No. Es una estimación inicial transparente del catálogo. Un operador revisa tu brief y envía una propuesta con alcance definido.",
      ),
    },
    {
      profile,
      question: c("What happens when I accept?", "¿Qué sucede cuando acepto?"),
      answer: c(
        "The exact version and option are recorded. A project, milestones and tasks are created together. This demo does not collect payment or provide certified signatures.",
        "Se registran la versión y opción exactas. Se crean juntos un proyecto, hitos y tareas. Esta demo no cobra pagos ni proporciona firmas certificadas.",
      ),
    },
    {
      profile,
      question: c(
        "Are notifications sent by email?",
        "¿Las notificaciones se envían por email?",
      ),
      answer: c(
        "Notifications are real inside this workspace inbox. External email and WhatsApp are not sent.",
        "Las notificaciones son reales dentro del inbox del workspace. No se envían emails ni WhatsApp externos.",
      ),
    },
  ];
}

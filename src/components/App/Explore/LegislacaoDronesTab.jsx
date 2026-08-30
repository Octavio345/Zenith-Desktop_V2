const officialLinks = [
  {
    label: "Regras de drones da ANAC",
    description: "Cadastro, responsabilidade do operador e regras civis.",
    href: "https://www.gov.br/anac/pt-br/assuntos/drones",
    icon: "app_registration",
  },
  {
    label: "Portal Drone UAS / DECEA",
    description: "Normas e orientações para acesso ao espaço aéreo.",
    href: "https://www.decea.mil.br/drone/",
    icon: "flight_takeoff",
  },
  {
    label: "Solicitar voo no SARPAS",
    description: "Planeje e solicite a autorização de acesso ao espaço aéreo.",
    href: "https://servicos.decea.mil.br/sarpas/",
    icon: "map",
  },
  {
    label: "Homologação na Anatel",
    description: "Confira a regularidade dos equipamentos de radiofrequência.",
    href: "https://www.gov.br/anatel/pt-br/assuntos/certificacao-e-homologacao",
    icon: "settings_input_antenna",
  },
]

const checklist = [
  {
    title: "Aeronave regularizada",
    text: "Confirme o enquadramento, cadastro e identificação aplicáveis ao peso, tipo de operação e regra vigente da ANAC. O cadastro deve vincular a aeronave ao responsável pela operação.",
    icon: "badge",
  },
  {
    title: "Rádio homologado",
    text: "Drone, controle remoto, telemetria e transmissão de vídeo usam radiofrequência. Verifique a homologação da Anatel antes de operar o equipamento.",
    icon: "verified",
  },
  {
    title: "Espaço aéreo autorizado",
    text: "Antes de cada missão, consulte o SARPAS e respeite as condições liberadas para local, horário e altura. A autorização de espaço aéreo é diferente do cadastro da aeronave.",
    icon: "approval",
  },
  {
    title: "Missão segura",
    text: "Planeje rota, relevo, vento, baterias, obstáculos, pessoas, animais e local de pouso. Ao identificar aeronave tripulada, interrompa a operação com segurança.",
    icon: "health_and_safety",
  },
]

const agencies = [
  {
    name: "ANAC",
    role: "Regras de aviação civil, enquadramento da operação, cadastro e responsabilidades do operador remoto.",
    icon: "assignment",
  },
  {
    name: "DECEA",
    role: "Acesso ao espaço aéreo e autorizações de voo por meio do SARPAS.",
    icon: "public",
  },
  {
    name: "Anatel",
    role: "Homologação dos itens de telecomunicação usados pela aeronave e pelo controle.",
    icon: "cell_tower",
  },
]

export default function LegislacaoDronesTab() {
  return (
    <section className="drone-law-container">
      <header className="drone-law-hero">
        <div>
          <span className="drone-law-kicker">Operação responsável de drones</span>
          <h2>Legislação e segurança de voo</h2>
          <p>
            Na agricultura, o drone apoia decisões no campo, mas continua sujeito às regras de
            aviação, espaço aéreo e radiofrequência. Use esta central como orientação rápida antes da missão.
          </p>
        </div>
        <span className="drone-law-hero-icon material-symbols-outlined" aria-hidden="true">gavel</span>
      </header>

      <aside className="drone-law-alert" role="note">
        <span className="material-symbols-outlined" aria-hidden="true">info</span>
        <p>As exigências variam conforme aeronave, peso, local, altura e modalidade de voo. Confirme sempre as regras e autorizações vigentes nos canais oficiais antes de decolar.</p>
      </aside>

      <section className="drone-law-section" aria-labelledby="drone-law-checklist-title">
        <div className="drone-law-section-title">
          <span className="material-symbols-outlined" aria-hidden="true">fact_check</span>
          <div>
            <span>Antes de decolar</span>
            <h3 id="drone-law-checklist-title">Quatro verificações essenciais</h3>
          </div>
        </div>
        <div className="drone-law-grid">
          {checklist.map((item) => (
            <article className="drone-law-card" key={item.title}>
              <span className="drone-law-card-icon material-symbols-outlined" aria-hidden="true">{item.icon}</span>
              <div>
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="drone-law-section" aria-labelledby="drone-law-agencies-title">
        <div className="drone-law-section-title">
          <span className="material-symbols-outlined" aria-hidden="true">account_balance</span>
          <div>
            <span>Responsabilidades separadas</span>
            <h3 id="drone-law-agencies-title">Quem regula o quê</h3>
          </div>
        </div>
        <div className="drone-law-agencies">
          {agencies.map((agency) => (
            <article className="drone-law-agency" key={agency.name}>
              <span className="material-symbols-outlined" aria-hidden="true">{agency.icon}</span>
              <h4>{agency.name}</h4>
              <p>{agency.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="drone-law-section" aria-labelledby="drone-law-links-title">
        <div className="drone-law-section-title">
          <span className="material-symbols-outlined" aria-hidden="true">link</span>
          <div>
            <span>Informação atualizada</span>
            <h3 id="drone-law-links-title">Canais oficiais</h3>
          </div>
        </div>
        <div className="drone-law-links">
          {officialLinks.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
              <span className="material-symbols-outlined" aria-hidden="true">{link.icon}</span>
              <span><strong>{link.label}</strong><small>{link.description}</small></span>
              <span className="material-symbols-outlined" aria-hidden="true">open_in_new</span>
            </a>
          ))}
        </div>
      </section>

      <p className="drone-law-note">
        Conteúdo informativo, não substitui a análise da operação nem os documentos oficiais. Regras e procedimentos podem mudar.
      </p>
    </section>
  )
}

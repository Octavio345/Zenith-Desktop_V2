import { useEffect, useState } from "react"

const phases = [
  { icon: "photo_library", label: "Preparando imagens" },
  { icon: "psychology", label: "Executando a IA" },
  { icon: "analytics", label: "Organizando resultado" },
]

export default function AnalysisLoader({ imageCount = 1 }) {
  const [elapsed, setElapsed] = useState(0)
  const phase = elapsed < 5 ? 0 : elapsed < 14 ? 1 : 2

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section className="analysis-loader" aria-live="polite">
      <div className="analysis-loader__scene" aria-hidden="true">
        <div className="analysis-loader__rings"><i /><i /><i /></div>
        <div className="analysis-loader__crop">
          <img src="/assets/image/soja-hero-cutout.webp" alt="" />
          <span className="analysis-loader__scan" />
          <span className="analysis-loader__focus analysis-loader__focus--one" />
          <span className="analysis-loader__focus analysis-loader__focus--two" />
        </div>
        <span className="analysis-loader__orbit analysis-loader__orbit--one material-symbols-outlined">eco</span>
        <span className="analysis-loader__orbit analysis-loader__orbit--two material-symbols-outlined">center_focus_strong</span>
      </div>

      <div className="analysis-loader__copy">
        <span className="analysis-loader__eyebrow"><i /> LEITURA VISUAL DO LOTE</span>
        <h2>{imageCount > 1 ? `Analisando ${imageCount} imagens` : "Analisando imagem"}</h2>
        <p>
          {elapsed < 8
            ? "Estamos preparando o lote e procurando padrões visuais na lavoura."
            : "Na primeira análise, o modelo pode levar alguns instantes para iniciar. Você pode aguardar nesta tela."}
        </p>
      </div>

      <div className="analysis-loader__phases">
        {phases.map((item, index) => (
          <div className={index < phase ? "done" : index === phase ? "active" : ""} key={item.label}>
            <span className="material-symbols-outlined">{index < phase ? "check" : item.icon}</span>
            <strong>{item.label}</strong>
          </div>
        ))}
      </div>

      <div className="analysis-loader__footer">
        <div className="analysis-loader__progress" aria-hidden="true"><span /></div>
        <small className="analysis-loader__time"><span className="material-symbols-outlined">verified_user</span> Processamento seguro · {elapsed}s</small>
      </div>
    </section>
  )
}

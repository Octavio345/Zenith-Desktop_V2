import { motion } from "framer-motion"
import { FaDownload, FaTimes, FaAndroid, FaApple, FaDesktop } from 'react-icons/fa'
import '../../../styles/Global/InstallPrompt.css'

const InstallPrompt = ({ onInstall, onClose, isIOS, isAndroid, isDesktop, hasPrompt }) => {
  return (
    <motion.div
      className="install-overlay"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="install-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-app-title"
        initial={{ scale: 0.9, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 40 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="install-box__close" type="button" onClick={onClose} aria-label="Fechar">
          <FaTimes />
        </button>

        <div className="install-brand-icon">
          <img src="/assets/image/Logo-512.png" alt="" />
          <span><FaDownload /></span>
        </div>

        <span className="install-eyebrow">ZENITH PARA {isDesktop ? "DESKTOP" : "SEU DISPOSITIVO"}</span>
        <h2 id="install-app-title">Leve sua fazenda com você</h2>
        <p className="install-subtitle">
          Instale a Zenith para abrir direto da sua área de trabalho, com a mesma segurança e experiência do site.
        </p>


        {hasPrompt && !isIOS && (
          <button className="install-main-btn" type="button" onClick={onInstall}>
            <FaDownload /> Instalar {isDesktop ? "no computador" : "agora"}
          </button>
        )}


        {!hasPrompt && (
          <div className="install-hint">
            {isIOS ? (
              <>
                <FaApple /> Toque em <b>Compartilhar</b> → <b>Tela de Início</b>
              </>
            ) : isAndroid ? (
              <>
                <FaAndroid /> Menu ⋮ → <b>Instalar app</b>
              </>
            ) : (
              <>
                <FaDesktop /> No Chrome ou Edge, abra o menu ⋮ e escolha <b>Instalar Zenith</b>.
              </>
            )}
          </div>
        )}


        <div className="install-benefits">
          <span><i className="material-symbols-outlined">bolt</i> Acesso rápido</span>
          <span><i className="material-symbols-outlined">open_in_new</i> Janela própria</span>
          <span><i className="material-symbols-outlined">verified_user</i> Seguro</span>
        </div>

        <button className="install-later-btn" type="button" onClick={onClose}>
          Agora não
        </button>
      </motion.div>
    </motion.div>
  )
}

export default InstallPrompt

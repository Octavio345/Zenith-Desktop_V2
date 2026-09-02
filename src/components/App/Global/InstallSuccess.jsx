
import { motion } from "framer-motion"
import { FaCheck, FaTimes } from "react-icons/fa"
import '../../../styles/Global/InstallSuccess.css'

const InstallSuccess = ({ onClose, isIOS, isAndroid }) => {
  return (
    <motion.div
      className="install-success-overlay"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="install-success"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-success-title"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="install-success-close" type="button" onClick={onClose} aria-label="Fechar">
          <FaTimes />
        </button>

        <div className="install-success__brand">
          <img src="/assets/image/Logo-192.png" alt="" />
          <span><FaCheck /></span>
        </div>

        <span className="install-success__eyebrow">APLICATIVO INSTALADO</span>
        <h2 id="install-success-title">Zenith instalada com sucesso</h2>
        <p className="install-success__message">
          {isIOS || isAndroid
            ? "O acesso foi adicionado à sua tela inicial. Toque no ícone da Zenith sempre que quiser abrir o aplicativo."
            : "O acesso foi adicionado ao seu computador. Abra a Zenith pela área de trabalho ou pelo menu de aplicativos."}
        </p>

        <div className="install-success__status">
          <span className="material-symbols-outlined" aria-hidden="true">verified_user</span>
          <div><strong>Instalação concluída</strong><small>Seus dados e recursos continuam sincronizados.</small></div>
        </div>

        <button className="success-button" type="button" onClick={onClose}>
          Continuar na Zenith <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
      </motion.div>
    </motion.div>
  )
}

export default InstallSuccess

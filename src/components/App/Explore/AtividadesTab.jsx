import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import { onAuthStateChanged } from "firebase/auth"
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query, updateDoc, where } from "firebase/firestore"
import { auth, db } from "../../../services/firebase"
import { isOperationalRole } from "../../../services/accessControl"
import { isAwaitingOwnerConfirmation, isConfirmedWorkItemExpired } from "../../../services/workItemLifecycle"
import { clearActivityDraft, getActivityDraft } from "../../../services/fieldOperations"
import CustomSelect from "../Global/CustomSelect"
import "../../../styles/App/AtividadesTab.css"

export default function AtividadesTab() {
  const [activities, setActivities] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterType, setFilterType] = useState("todas")
  const [filterStatus, setFilterStatus] = useState("todos")
  const [searchTerm, setSearchTerm] = useState("")
  const [userProfile, setUserProfile] = useState(null)
  const [employees, setEmployees] = useState([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [activityMessage, setActivityMessage] = useState("")
  const [lifecycleNow, setLifecycleNow] = useState(Date.now())
  const [newActivity, setNewActivity] = useState({
    title: "",
    description: "",
    type: "tarefa",
    status: "pendente",
    priority: "media",
    date: new Date().toISOString().split("T")[0],
    time: "",
    responsible: "",
    scope: "general",
    assigneeId: ""
  })


  const activityTypes = [
    { id: "tarefa", name: "Tarefa", icon: "assignment", color: "#347b4e" },
    { id: "voo", name: "Voo de Drone", icon: "flight", color: "#426b87" },
    { id: "irrigacao", name: "Irrigação", icon: "water_drop", color: "#39708a" },
    { id: "pulverizacao", name: "Pulverização", icon: "spray", color: "#f39c12" },
    { id: "colheita", name: "Colheita", icon: "agriculture", color: "#2e6f46" },
    { id: "manutencao", name: "Manutenção", icon: "handyman", color: "#e74c3c" }
  ]

  const priorities = [
    { id: "alta", name: "Alta", icon: "priority_high", color: "#e74c3c" },
    { id: "media", name: "Média", icon: "drag_handle", color: "#f39c12" },
    { id: "baixa", name: "Baixa", icon: "low_priority", color: "#4f8d63" }
  ]

  const statuses = [
    { id: "pendente", name: "Pendente", icon: "pending", color: "#f39c12" },
    { id: "em_andamento", name: "Em andamento", icon: "play_circle", color: "#3498db" },
    { id: "concluida", name: "Concluída", icon: "check_circle", color: "#3f7f56" },
    { id: "cancelada", name: "Cancelada", icon: "cancel", color: "#e74c3c" }
  ]

  const typeOptions = activityTypes.map(type => ({ value: type.id, label: type.name }))
  const priorityOptions = priorities.map(priority => ({ value: priority.id, label: priority.name }))
  const statusOptions = statuses.map(status => ({ value: status.id, label: status.name }))

  const isEmployee = isOperationalRole(userProfile?.role)
  const isOwner = Boolean(userProfile) && !isEmployee

  useEffect(() => {
    const timer = window.setInterval(() => setLifecycleNow(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const draft = getActivityDraft()
    if (!draft) return
    setNewActivity((current) => ({ ...current, ...draft, status: "pendente", date: current.date, time: "" }))
    setShowForm(true)
  }, [])

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) { setUserProfile(null); setActivitiesLoading(false); return }
    try {
      const profileSnap = await getDoc(doc(db, "users", user.uid))
      setUserProfile(profileSnap.exists() ? { id: user.uid, ...profileSnap.data() } : null)
    } catch (error) {
      console.error("Erro ao carregar acesso das atividades:", error)
      setActivitiesLoading(false)
    }
  }), [])

  useEffect(() => {
    const user = auth.currentUser
    if (!user || !userProfile) return undefined
    setActivitiesLoading(true)
    const unsubscribers = []

    if (!isOperationalRole(userProfile.role)) {
      const ownerActivities = query(collection(db, "activities"), where("ownerId", "==", user.uid))
      const teamMembers = query(collection(db, "users"), where("ownerId", "==", user.uid))
      unsubscribers.push(onSnapshot(ownerActivities, (snapshot) => {
        setActivities(snapshot.docs.map((activityDoc) => ({ id: activityDoc.id, ...activityDoc.data() })))
        setActivitiesLoading(false)
      }, (error) => { console.error("Erro ao sincronizar atividades:", error); setActivityMessage("Não foi possível carregar as atividades compartilhadas."); setActivitiesLoading(false) }))
      unsubscribers.push(onSnapshot(teamMembers, (snapshot) => {
        setEmployees(snapshot.docs.map((memberDoc) => ({ id: memberDoc.id, ...memberDoc.data() })).filter((member) => isOperationalRole(member.role)))
      }))
    } else {
      const ownerId = userProfile.ownerId || userProfile.teamId
      const generalActivities = query(collection(db, "activities"), where("ownerId", "==", ownerId), where("scope", "==", "general"))
      const assignedActivities = query(collection(db, "activities"), where("assigneeId", "==", user.uid))
      let general = []
      let assigned = []
      const syncVisible = () => setActivities([...new Map([...general, ...assigned].map((activity) => [activity.id, activity])).values()])
      unsubscribers.push(onSnapshot(generalActivities, (snapshot) => { general = snapshot.docs.map((activityDoc) => ({ id: activityDoc.id, ...activityDoc.data() })); syncVisible(); setActivitiesLoading(false) }))
      unsubscribers.push(onSnapshot(assignedActivities, (snapshot) => { assigned = snapshot.docs.map((activityDoc) => ({ id: activityDoc.id, ...activityDoc.data() })); syncVisible(); setActivitiesLoading(false) }))
    }

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [userProfile])

  const addActivity = async () => {
    const user = auth.currentUser
    if (!user || !isOwner || !newActivity.title.trim()) return
    if (newActivity.scope === "individual" && !newActivity.assigneeId) { setActivityMessage("Selecione o funcionário responsável."); return }
    const assignee = employees.find((employee) => employee.id === newActivity.assigneeId)
    try {
      await addDoc(collection(db, "activities"), {
        ...newActivity,
        title: newActivity.title.trim(),
        description: newActivity.description.trim(),
        ownerId: user.uid,
        assigneeId: newActivity.scope === "individual" ? newActivity.assigneeId : "",
        responsible: newActivity.scope === "individual" ? assignee?.name || "Funcionário" : "Toda a fazenda",
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      setNewActivity({ title: "", description: "", type: "tarefa", status: "pendente", priority: "media", date: new Date().toISOString().split("T")[0], time: "", responsible: "", scope: "general", assigneeId: "" })
      clearActivityDraft()
      setActivityMessage("")
      setShowForm(false)
    } catch (error) { console.error("Erro ao criar atividade:", error); setActivityMessage("Não foi possível criar a atividade. Publique as regras atualizadas do Firestore.") }
  }

  const updateActivity = async () => {
    if (!selectedActivity || !isOwner) return
    if (selectedActivity.scope === "individual" && !selectedActivity.assigneeId) {
      setActivityMessage("Selecione o funcionário responsável.")
      return
    }
    try {
      const { id, ...activityData } = selectedActivity
      const assignee = employees.find((employee) => employee.id === activityData.assigneeId)
      await updateDoc(doc(db, "activities", id), {
        ...activityData,
        assigneeId: activityData.scope === "individual" ? activityData.assigneeId : "",
        responsible: activityData.scope === "individual" ? assignee?.name || "Funcionário" : "Toda a fazenda",
        updatedAt: new Date().toISOString(),
      })
      setSelectedActivity(null)
    } catch (error) { console.error("Erro ao editar atividade:", error); setActivityMessage("Não foi possível salvar a atividade.") }
  }

  const deleteActivity = async (id) => {
    if (!isOwner) return
    try { await deleteDoc(doc(db, "activities", id)); setDeleteTarget(null) }
    catch (error) { console.error("Erro ao excluir atividade:", error); setActivityMessage("Não foi possível excluir a atividade.") }
  }

  const changeStatus = async (activity, newStatus) => {
    if (!isOwner && activity.assigneeId !== auth.currentUser?.uid) return
    const now = new Date().toISOString()
    const payload = { status: newStatus, updatedAt: now, ...(newStatus === "em_andamento" ? { startedAt: now } : {}), ...(newStatus === "concluida" ? { completedAt: now } : {}) }
    try { await updateDoc(doc(db, "activities", activity.id), payload) }
    catch (error) { console.error("Erro ao atualizar atividade:", error); setActivityMessage("Não foi possível atualizar a atividade.") }
  }

  const confirmCompletion = async (activity) => {
    if (!isOwner || !isAwaitingOwnerConfirmation(activity) || !auth.currentUser?.uid) return
    const now = new Date().toISOString()
    try {
      await updateDoc(doc(db, "activities", activity.id), {
        ownerConfirmedAt: now,
        ownerConfirmedBy: auth.currentUser.uid,
        updatedAt: now,
      })
    } catch (error) {
      console.error("Erro ao confirmar conclusão da atividade:", error)
      setActivityMessage("Não foi possível confirmar a finalização da atividade.")
    }
  }

  const visibleActivities = activities.filter((activity) => !isConfirmedWorkItemExpired(activity, lifecycleNow))
  const filteredActivities = visibleActivities.filter(activity => {
    const matchesType = filterType === "todas" || activity.type === filterType
    const matchesStatus = filterStatus === "todos" || activity.status === filterStatus
    const matchesSearch = String(activity.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          String(activity.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesStatus && matchesSearch
  })

  const sortedActivities = [...filteredActivities].sort((a, b) => {
    return new Date(b.date + " " + b.time) - new Date(a.date + " " + a.time)
  })

  const totalActivities = visibleActivities.length
  const pendingActivities = visibleActivities.filter(a => a.status === "pendente").length
  const completedActivities = visibleActivities.filter(a => a.status === "concluida").length
  const inProgressActivities = visibleActivities.filter(a => a.status === "em_andamento").length

  const getTypeInfo = (typeId) => activityTypes.find(t => t.id === typeId) || activityTypes[0]
  const getPriorityInfo = (priorityId) => priorities.find(p => p.id === priorityId) || priorities[1]
  const getStatusInfo = (statusId) => statuses.find(s => s.id === statusId) || statuses[0]

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (date.toDateString() === today.toDateString()) return "Hoje"
    if (date.toDateString() === tomorrow.toDateString()) return "Amanhã"
    return date.toLocaleDateString("pt-BR")
  }

  const isOverdue = (activity) => {
    if (activity.status === "concluida" || activity.status === "cancelada") return false
    return new Date(activity.date + " " + activity.time) < new Date()
  }

  return (
    <div className="atividades-container">

      <div className="atividades-header">
        <div>
          <h2>Atividades</h2>
          <p>{isOwner ? "Organize atividades gerais ou distribua operações para cada funcionário." : "Acompanhe as atividades gerais da fazenda e as operações atribuídas a você."}</p>
        </div>
        {isOwner && <button className="add-activity-btn" onClick={() => setShowForm(true)}>
          <span className="material-symbols-outlined">add</span>
          Nova atividade
        </button>}
      </div>

      {activityMessage && (
        <div className="activity-message" role="status">
          <span className="material-symbols-outlined">info</span>
          <span>{activityMessage}</span>
          <button type="button" aria-label="Fechar aviso" onClick={() => setActivityMessage("")}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}


      <div className="atividades-stats">
        <div className="stat-card">
          <span className="material-symbols-outlined">assignment</span>
          <div>
            <strong>{totalActivities}</strong>
            <p>Total</p>
          </div>
        </div>
        <div className="stat-card pending">
          <span className="material-symbols-outlined">pending</span>
          <div>
            <strong>{pendingActivities}</strong>
            <p>Pendentes</p>
          </div>
        </div>
        <div className="stat-card progress">
          <span className="material-symbols-outlined">play_circle</span>
          <div>
            <strong>{inProgressActivities}</strong>
            <p>Em andamento</p>
          </div>
        </div>
        <div className="stat-card completed">
          <span className="material-symbols-outlined">check_circle</span>
          <div>
            <strong>{completedActivities}</strong>
            <p>Concluídas</p>
          </div>
        </div>
      </div>


      <div className="atividades-controls">
        <div className="search-bar">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Buscar atividade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-row">
          <CustomSelect
            className="filter-select"
            value={filterType}
            onChange={setFilterType}
            options={[{ value: "todas", label: "Todos os tipos" }, ...typeOptions]}
          />
          <CustomSelect
            className="filter-select"
            value={filterStatus}
            onChange={setFilterStatus}
            options={[{ value: "todos", label: "Todos os status" }, ...statusOptions]}
          />
        </div>
      </div>


      <div className="activities-list">
        {activitiesLoading ? (
          <div className="empty-state activities-loading">
            <span className="material-symbols-outlined">sync</span>
            <p>Sincronizando atividades da fazenda...</p>
          </div>
        ) : sortedActivities.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">assignment_turned_in</span>
            <p>Nenhuma atividade encontrada</p>
            {isOwner && <button onClick={() => setShowForm(true)}>Criar atividade</button>}
          </div>
        ) : (
          sortedActivities.map((activity, index) => {
            const typeInfo = getTypeInfo(activity.type)
            const priorityInfo = getPriorityInfo(activity.priority)
            const statusInfo = getStatusInfo(activity.status)
            const overdue = isOverdue(activity)

            return (
              <motion.div
                key={activity.id}
                className={`activity-card ${activity.status} ${overdue ? "overdue" : ""}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                onClick={() => isOwner && setSelectedActivity({ ...activity, scope: activity.scope || "general", assigneeId: activity.assigneeId || "" })}
              >
                <div className="activity-header">
                  <div className="activity-icon" style={{ background: `${typeInfo.color}1a`, color: typeInfo.color }}>
                    <span className="material-symbols-outlined">{typeInfo.icon}</span>
                  </div>
                  <div className="activity-info">
                    <h3>{activity.title}</h3>
                    <div className="activity-meta">
                      <span className="activity-type">{typeInfo.name}</span>
                      <span className="activity-date">
                        <span className="material-symbols-outlined">schedule</span>
                        {formatDate(activity.date)} {activity.time && `às ${activity.time}`}
                      </span>
                    </div>
                  </div>
                  <div className="activity-badges">
                    <div className={`priority-badge ${activity.priority}`}>
                      <span className="material-symbols-outlined">{priorityInfo.icon}</span>
                      {priorityInfo.name}
                    </div>
                    <div className={`status-badge ${activity.status}`}>
                      <span className="material-symbols-outlined">{statusInfo.icon}</span>
                      {statusInfo.name}
                    </div>
                  </div>
                </div>

                {activity.description && (
                  <div className="activity-description">
                    <p>{activity.description}</p>
                  </div>
                )}

                <div className="activity-info-row">
                  {activity.responsible && (
                    <div className="activity-responsible">
                      <span className="material-symbols-outlined">{activity.scope === "general" ? "groups" : "person"}</span>
                      <span>{activity.responsible}</span>
                    </div>
                  )}
                  {overdue && activity.status !== "concluida" && (
                    <div className="overdue-badge">
                      <span className="material-symbols-outlined">warning</span>
                      Atrasada
                    </div>
                  )}
                </div>

                <div className="activity-actions">
                  {(isOwner || activity.assigneeId === auth.currentUser?.uid) && activity.status === "pendente" && (
                    <button
                      className="action-start"
                      onClick={(e) => { e.stopPropagation(); changeStatus(activity, "em_andamento") }}
                    >
                      <span className="material-symbols-outlined">play_arrow</span>
                      Iniciar
                    </button>
                  )}
                  {(isOwner || activity.assigneeId === auth.currentUser?.uid) && activity.status === "em_andamento" && (
                    <button
                      className="action-complete"
                      onClick={(e) => { e.stopPropagation(); changeStatus(activity, "concluida") }}
                    >
                      <span className="material-symbols-outlined">check</span>
                      Concluir
                    </button>
                  )}
                  {isOwner && isAwaitingOwnerConfirmation(activity) && (
                    <button
                      className="action-confirm"
                      onClick={(e) => { e.stopPropagation(); confirmCompletion(activity) }}
                    >
                      <span className="material-symbols-outlined">verified</span>
                      Confirmar finalização
                    </button>
                  )}
                  {isOwner && <button
                    className="action-delete"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(activity) }}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>}
                </div>
              </motion.div>
            )
          })
        )}
      </div>


        {showForm && createPortal((
          <motion.div
            className="atividades-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="activity-form"
              initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="form-header">
                <h3>Nova Atividade</h3>
                <button className="close-btn" onClick={() => setShowForm(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="form-group">
                <label>Título</label>
                <input type="text" placeholder="Ex: Aplicação de fungicida"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({...newActivity, title: e.target.value})} />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea rows="3" placeholder="Detalhes da atividade..."
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({...newActivity, description: e.target.value})} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Visibilidade</label>
                  <CustomSelect
                    value={newActivity.scope}
                    onChange={(scope) => setNewActivity({ ...newActivity, scope, assigneeId: "" })}
                    options={[
                      { value: "general", label: "Toda a fazenda" },
                      { value: "individual", label: "Funcionário específico" },
                    ]}
                  />
                </div>
                {newActivity.scope === "individual" && (
                  <div className="form-group">
                    <label>Funcionário responsável</label>
                    <CustomSelect
                      value={newActivity.assigneeId}
                      onChange={(assigneeId) => setNewActivity({ ...newActivity, assigneeId })}
                      options={[
                        { value: "", label: "Selecione o funcionário" },
                        ...employees.map((employee) => ({ value: employee.id, label: employee.name || employee.email || "Funcionário" })),
                      ]}
                    />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo</label>
                  <CustomSelect value={newActivity.type}
                    onChange={(type) => setNewActivity({ ...newActivity, type })}
                    options={typeOptions} />
                </div>
                <div className="form-group">
                  <label>Prioridade</label>
                  <CustomSelect value={newActivity.priority}
                    onChange={(priority) => setNewActivity({ ...newActivity, priority })}
                    options={priorityOptions} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data</label>
                  <input type="date" value={newActivity.date}
                    onChange={(e) => setNewActivity({...newActivity, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Horário</label>
                  <input type="time" value={newActivity.time}
                    onChange={(e) => setNewActivity({...newActivity, time: e.target.value})} />
                </div>
              </div>

              <button className="submit-btn" onClick={addActivity}>Criar atividade</button>
            </motion.div>
          </motion.div>
        ), document.body)}


        {selectedActivity && createPortal((
          <motion.div
            className="atividades-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedActivity(null)}
          >
            <motion.div
              className="activity-form"
              initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="form-header">
                <h3>Editar Atividade</h3>
                <button className="close-btn" onClick={() => setSelectedActivity(null)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="form-group">
                <label>Título</label>
                <input type="text" value={selectedActivity.title}
                  onChange={(e) => setSelectedActivity({...selectedActivity, title: e.target.value})} />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea rows="3" value={selectedActivity.description}
                  onChange={(e) => setSelectedActivity({...selectedActivity, description: e.target.value})} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Visibilidade</label>
                  <CustomSelect
                    value={selectedActivity.scope || "general"}
                    onChange={(scope) => setSelectedActivity({ ...selectedActivity, scope, assigneeId: "" })}
                    options={[
                      { value: "general", label: "Toda a fazenda" },
                      { value: "individual", label: "Funcionário específico" },
                    ]}
                  />
                </div>
                {selectedActivity.scope === "individual" && (
                  <div className="form-group">
                    <label>Funcionário responsável</label>
                    <CustomSelect
                      value={selectedActivity.assigneeId || ""}
                      onChange={(assigneeId) => setSelectedActivity({ ...selectedActivity, assigneeId })}
                      options={[
                        { value: "", label: "Selecione o funcionário" },
                        ...employees.map((employee) => ({ value: employee.id, label: employee.name || employee.email || "Funcionário" })),
                      ]}
                    />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo</label>
                  <CustomSelect value={selectedActivity.type}
                    onChange={(type) => setSelectedActivity({ ...selectedActivity, type })}
                    options={typeOptions} />
                </div>
                <div className="form-group">
                  <label>Prioridade</label>
                  <CustomSelect value={selectedActivity.priority}
                    onChange={(priority) => setSelectedActivity({ ...selectedActivity, priority })}
                    options={priorityOptions} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data</label>
                  <input type="date" value={selectedActivity.date}
                    onChange={(e) => setSelectedActivity({...selectedActivity, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Horário</label>
                  <input type="time" value={selectedActivity.time || ""}
                    onChange={(e) => setSelectedActivity({...selectedActivity, time: e.target.value})} />
                </div>
              </div>

              <button className="submit-btn" onClick={updateActivity}>Salvar alterações</button>
            </motion.div>
          </motion.div>
        ), document.body)}


        {deleteTarget && createPortal((
          <motion.div
            className="atividades-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              className="activity-form confirm-form"
              initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="form-header">
                <h3>Excluir atividade?</h3>
                <button className="close-btn" onClick={() => setDeleteTarget(null)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="confirm-text">
                Você tem certeza que quer remover <strong>{deleteTarget.title}</strong>?
              </p>
              <div className="form-row">
                <button className="submit-btn secondary-btn" onClick={() => setDeleteTarget(null)}>
                  Cancelar
                </button>
                <button className="submit-btn danger-btn" onClick={() => deleteActivity(deleteTarget.id)}>
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        ), document.body)}
    </div>
  )
}

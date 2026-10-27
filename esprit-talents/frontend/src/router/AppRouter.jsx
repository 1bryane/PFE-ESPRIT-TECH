import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Auth
import Login    from '../pages/auth/Login'
import Register from '../pages/auth/Register'

// Candidat
import CandidatOffres       from '../pages/candidat/Offres'
import CandidatProfil       from '../pages/candidat/Profil'
import CandidatCandidatures from '../pages/candidat/MesCandidatures'

// Enseignant
import EnseignantDashboard   from '../pages/enseignant/Dashboard'
import EnseignantEvaluations from '../pages/enseignant/Evaluations'
import EnseignantFormations  from '../pages/enseignant/Formations'

// RP Coordinateur
import RPCoordOffres    from '../pages/rp_coord/MesOffres'
import RPCoordCandidats from '../pages/rp_coord/CandidatsOffre'

// RP Chef
import RPChefDashboard from '../pages/rp_chef/Dashboard'

// RDFF
import RDFFFormations from '../pages/rdff/Formations'

// RH / Admin
import RHRecrutement from '../pages/rh/Recrutement'
import RHEffectifs   from '../pages/rh/Effectifs'

// Direction Generale
import DirectionDashboard from '../pages/direction/Dashboard'

// Direction des Etudes (NOUVEAU)
import DirectionEtudesDashboard from '../pages/direction_etudes/Dashboard'

// Shared
import ARIAChat          from '../pages/shared/ARIAChat'
import ChatPage          from '../pages/shared/ChatPage'
import Help              from '../pages/shared/Help'
import NotificationsPage from '../pages/shared/Notifications'
import Recommandations   from '../pages/shared/Recommandations'
import PlansCarriere     from '../pages/shared/PlansCarriere'
import Distinctions      from '../pages/shared/Distinctions'

import Layout from '../components/Layout/Layout'

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F4F4F4' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
        <p className="text-sm" style={{ color: '#8C8C8C' }}>Chargement...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const routes = {
    candidat:         '/offres',
    enseignant:       '/dashboard',
    talent:           '/dashboard',
    rp_coord:         '/dashboard',
    rp_chef:          '/chef/dashboard',
    rdff:             '/rdff/formations',
    chef_admin:       '/dashboard',
    direction_etudes: '/direction-etudes/dashboard',
    direction:        '/direction/dashboard',
    cup:              '/dashboard',
    chef_dept:        '/chef/dashboard',
    direction_dept:   '/direction-dept/dashboard',
    responsable:      '/dashboard',
    cps:              '/dashboard',
    charge_mission:   '/dashboard',
  }
  return <Navigate to={routes[user.role] || '/offres'} replace />
}

const ALL_STAFF = ['enseignant','talent','rp_coord','rp_chef','rdff','chef_admin','direction_etudes','direction','cup','chef_dept','direction_dept','responsable','cps','charge_mission']
const TALENT_MANAGERS = ['chef_admin','direction','direction_etudes','cup','chef_dept','direction_dept','rp_chef','rp_coord']

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<HomeRedirect />} />

        {/* ─── Candidat ─── */}
        <Route path="offres"       element={<CandidatOffres />} />
        <Route path="profil"       element={<CandidatProfil />} />
        <Route path="candidatures" element={<CandidatCandidatures />} />

        {/* ─── Enseignant & Talent ─── */}
        <Route path="dashboard"   element={<PrivateRoute roles={[...ALL_STAFF,'candidat']}><EnseignantDashboard /></PrivateRoute>} />
        <Route path="evaluations" element={<PrivateRoute roles={['enseignant','talent','rp_coord','rp_chef','direction_etudes','cup','chef_dept']}><EnseignantEvaluations /></PrivateRoute>} />
        <Route path="formations"  element={<PrivateRoute roles={['enseignant','talent','rp_coord','rp_chef','cup','chef_dept']}><EnseignantFormations /></PrivateRoute>} />

        {/* ─── Coordinateur d'Unité Pédagogique (cup = nouveau nom de rp_coord) ─── */}
        <Route path="rp/offres"     element={<PrivateRoute roles={['rp_coord','rp_chef','cup','chef_dept']}><RPCoordOffres /></PrivateRoute>} />
        <Route path="rp/offres/:id" element={<PrivateRoute roles={['rp_coord','rp_chef','cup','chef_dept']}><RPCoordCandidats /></PrivateRoute>} />

        {/* ─── Chef de Département (chef_dept = nouveau nom de rp_chef) ─── */}
        <Route path="chef/dashboard" element={<PrivateRoute roles={['rp_chef','chef_dept']}><RPChefDashboard /></PrivateRoute>} />

        {/* ─── RDFF ─── */}
        <Route path="rdff/formations" element={<PrivateRoute roles={['rdff']}><RDFFFormations /></PrivateRoute>} />

        {/* ─── RH / Admin ─── */}
        <Route path="rh/recrutement" element={<PrivateRoute roles={['chef_admin']}><RHRecrutement /></PrivateRoute>} />
        <Route path="rh/effectifs"   element={<PrivateRoute roles={['chef_admin']}><RHEffectifs /></PrivateRoute>} />

        {/* ─── Direction Générale ─── */}
        <Route path="direction/dashboard" element={<PrivateRoute roles={['direction']}><DirectionDashboard /></PrivateRoute>} />

        {/* ─── Direction des Etudes ─── */}
        <Route path="direction-etudes/dashboard" element={<PrivateRoute roles={['direction_etudes']}><DirectionEtudesDashboard /></PrivateRoute>} />

        {/* ─── Direction Département (nouveau) ─── */}
        <Route path="direction-dept/dashboard" element={<PrivateRoute roles={['direction_dept']}><DirectionEtudesDashboard /></PrivateRoute>} />

        {/* ─── Modules Talent partagés ─── */}
        <Route path="recommandations"   element={<PrivateRoute roles={[...ALL_STAFF]}><Recommandations /></PrivateRoute>} />
        <Route path="plans-carriere"    element={<PrivateRoute roles={[...ALL_STAFF]}><PlansCarriere /></PrivateRoute>} />
        <Route path="distinctions"      element={<PrivateRoute roles={[...ALL_STAFF]}><Distinctions /></PrivateRoute>} />

        {/* ─── Shared ─── */}
        <Route path="aria"          element={<PrivateRoute roles={ALL_STAFF}><ARIAChat /></PrivateRoute>} />
        <Route path="chat"          element={<PrivateRoute roles={ALL_STAFF}><ChatPage /></PrivateRoute>} />
        <Route path="chat/:userId"  element={<PrivateRoute roles={ALL_STAFF}><ChatPage /></PrivateRoute>} />
        <Route path="help"          element={<Help />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

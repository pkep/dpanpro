import {
  MdLock, MdWaterDrop, MdElectricBolt, MdThermostat, MdWindow, MdBuild,
  MdAcUnit, MdAccessTime, MdFlashOn, MdPriorityHigh,
  MdVerifiedUser, MdShield, MdStar,
} from 'react-icons/md'
import { createElement } from 'react'
import type { InterventionCategory } from '@/types/intervention.types'

export const SERVICES: {
  id: InterventionCategory; label: string; sublabel: string
  icon: React.ReactNode; color: string; active: boolean;
}[] = [
  { id: 'locksmith',   label: 'Serrurerie',   sublabel: 'Porte claquée, serrure bloquée…',  icon: createElement(MdLock),         color: 'from-amber-400/20 to-amber-500/10 border-amber-400/30 text-amber-500', active: true },
  { id: 'plumbing',    label: 'Plomberie',     sublabel: 'Fuite, canalisation, robinet…',    icon: createElement(MdWaterDrop),    color: 'from-sky-400/20 to-sky-500/10 border-sky-400/30 text-sky-500', active: true },
  { id: 'electricity', label: 'Électricité',   sublabel: 'Panne de courant, court-circuit…', icon: createElement(MdElectricBolt), color: 'from-yellow-400/20 to-yellow-500/10 border-yellow-400/30 text-yellow-500', active: true },
  { id: 'glazing',     label: 'Vitrerie',      sublabel: 'Vitre cassée, double vitrage…',    icon: createElement(MdWindow),       color: 'from-cyan-400/20 to-cyan-500/10 border-cyan-400/30 text-cyan-500', active: true },
  { id: 'heating',     label: 'Chauffage',     sublabel: 'Chaudière, radiateur, ballon…',    icon: createElement(MdThermostat),  color: 'from-orange-400/20 to-orange-500/10 border-orange-400/30 text-orange-500', active: false },
  { id: 'aircon',      label: 'Climatisation', sublabel: 'Clim en panne, installation…',     icon: createElement(MdAcUnit),       color: 'from-teal-400/20 to-teal-500/10 border-teal-400/30 text-teal-500', active: false },
]

export const URGENCIES = [
  { id: 'normal',  label: 'Standard',    delay: 'Dans la journée',  icon: createElement(MdAccessTime),  bg: 'from-emerald-50 to-emerald-100/50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  { id: 'high',    label: 'Prioritaire', delay: 'Sous 3h',  icon: createElement(MdFlashOn),     bg: 'from-amber-50 to-amber-100/50',    border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  { id: 'urgent',  label: 'Urgence',     delay: 'Sous 1h',   icon: createElement(MdPriorityHigh),bg: 'from-rose-50 to-rose-100/50',      border: 'border-rose-200',    text: 'text-rose-700',    dot: 'bg-rose-400' },
]

export const URGENCY_DELAYS: Record<string, string> = {
  none:   'sous 1 jour',
  normal: 'Dans la journée',
  high:   'Sous 3h',
  urgent: 'Sous 1h',
}

export const STEPS = [
  { num: '01', label: 'Votre besoin' },
  { num: '02', label: 'Votre problème' },
  { num: '03', label: 'Vos coordonnées' },
  { num: '04', label: 'Confirmation' },
]

export const DESCRIPTION_OPTIONS: Record<InterventionCategory, string[]> = {
  locksmith:   ["Porte claquée", "Serrure bloquée", "Perte de clés", "Serrure forcée", "Clé cassée dans la serrure", "Porte qui ne ferme plus", "Changement de serrure", "Ouverture sans dégâts"],
  plumbing:    ["Fuite d'eau", "Canalisation bouchée", "Robinet qui coule", "Chauffe-eau en panne", "WC bouché", "Fuite sous évier", "Pression d'eau insuffisante", "Dégât des eaux"],
  electricity: ["Panne de courant", "Disjoncteur qui saute", "Prise ne fonctionne plus", "Court-circuit", "Problème de tableau électrique", "Éclairage défaillant", "Câblage endommagé", "Installation neuve"],
  glazing:     ["Vitre cassée", "Double vitrage fissuré", "Fenêtre qui ne ferme plus", "Porte vitrée brisée", "Velux endommagé", "Vitrine commerciale", "Bris de glace suite effraction", "Joint de vitrage à refaire"],
  heating:     ["Chaudière en panne", "Radiateur froid", "Ballon d'eau chaude HS", "Pompe à chaleur défaillante", "Thermostat en panne", "Fuite dans le circuit de chauffage", "Bruit anormal chaudière", "Entretien annuel"],
  aircon:      ["Clim ne refroidit plus", "Clim ne s'allume pas", "Bruit anormal", "Fuite de liquide frigorigène", "Télécommande HS", "Installation nouvelle climatisation", "Entretien / nettoyage", "Mauvaise odeur"],
}

export const CATEGORY_LABELS: Record<InterventionCategory, string> = {
  locksmith: 'Serrurerie', plumbing: 'Plomberie', electricity: 'Électricité',
  glazing: 'Vitrerie', heating: 'Chauffage', aircon: 'Climatisation',
}

export const OPTION_PRICES: Record<InterventionCategory, Record<string, [number, number]>> = {
  locksmith: {
    'Porte claquée':              [90,  150],
    'Serrure bloquée':            [80,  130],
    'Perte de clés':              [90,  160],
    'Serrure forcée':             [100, 200],
    'Clé cassée dans la serrure': [80,  140],
    'Porte qui ne ferme plus':    [90,  170],
    'Changement de serrure':      [120, 250],
    'Ouverture sans dégâts':      [80,  150],
  },
  plumbing: {
    "Fuite d'eau":                [80,  150],
    'Canalisation bouchée':       [90,  180],
    'Robinet qui coule':          [60,  120],
    'Chauffe-eau en panne':       [150, 400],
    'WC bouché':                  [70,  150],
    'Fuite sous évier':           [60,  120],
    "Pression d'eau insuffisante":[80,  160],
    "Dégât des eaux":             [150, 500],
  },
  electricity: {
    'Panne de courant':                   [80,  150],
    'Disjoncteur qui saute':              [70,  130],
    'Prise ne fonctionne plus':           [60,  120],
    'Court-circuit':                      [100, 250],
    'Problème de tableau électrique':     [120, 300],
    'Éclairage défaillant':               [60,  140],
    'Câblage endommagé':                  [100, 280],
    'Installation neuve':                 [150, 500],
  },
  glazing: {
    'Vitre cassée':                       [80,  200],
    'Double vitrage fissuré':             [150, 350],
    'Fenêtre qui ne ferme plus':          [80,  180],
    'Porte vitrée brisée':                [150, 400],
    'Velux endommagé':                    [200, 500],
    'Vitrine commerciale':                [200, 600],
    'Bris de glace suite effraction':     [150, 400],
    'Joint de vitrage à refaire':         [60,  150],
  },
  heating: {
    'Chaudière en panne':                 [150, 400],
    'Radiateur froid':                    [80,  200],
    "Ballon d'eau chaude HS":             [150, 500],
    'Pompe à chaleur défaillante':        [200, 600],
    'Thermostat en panne':                [60,  150],
    'Fuite dans le circuit de chauffage': [100, 250],
    'Bruit anormal chaudière':            [80,  200],
    'Entretien annuel':                   [80,  150],
  },
  aircon: {
    'Clim ne refroidit plus':             [100, 250],
    "Clim ne s'allume pas":               [80,  200],
    'Bruit anormal':                      [70,  180],
    'Fuite de liquide frigorigène':       [150, 350],
    'Télécommande HS':                    [30,   80],
    'Installation nouvelle climatisation':[300, 800],
    'Entretien / nettoyage':              [80,  150],
    'Mauvaise odeur':                     [60,  130],
  },
}

export const URGENCY_MULTIPLIER: Record<string, number> = {
  none:   1.0,
  normal: 1.0,
  high:   1.4,
  urgent: 1.6,
}

export const FEATURES = [
  { icon: createElement(MdFlashOn,       { className: 'text-base' }), text: 'Technicien chez vous en moins de 30 min' },
  { icon: createElement(MdVerifiedUser,  { className: 'text-base' }), text: 'Artisans certifiés & assurés' },
  { icon: createElement(MdShield,        { className: 'text-base' }), text: 'Paiement 100% sécurisé' },
  { icon: createElement(MdStar,          { className: 'text-base' }), text: 'Note moyenne 4.5/5 sur +12 000 avis' },
]

// Unused export kept for compatibility
export { MdBuild }

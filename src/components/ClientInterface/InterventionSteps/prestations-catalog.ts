import type { InterventionCategory } from '@/types/intervention.types'

export interface Variante {
  id: string
  name: string
  min_price: number
  max_price: number
  prestation_id: string
}

export interface Prestation {
  id: string
  name: string
  description: string
  domain_code: string
  min_price: number
  max_price: number
  variantes: Variante[]
}

export const PRESTATIONS_CATALOG: Partial<Record<InterventionCategory, Prestation[]>> = {

  /* ─────────────── CLIMATISATION ─────────────── */
  aircon: [
    {
      id: 'd3421bd1-7e13-4fb0-893c-089c814eef89',
      name: 'Installation clim monosplit',
      description: 'Fourniture + pose 1 unité intérieure + 1 unité extérieure.',
      domain_code: 'aircon',
      min_price: 1200,
      max_price: 2500,
      variantes: [
        { id: '272ffad8-290c-4d5e-a02a-bc8dd3655052', name: '2,5 kW — 25 m²', min_price: 1200, max_price: 1800, prestation_id: 'd3421bd1-7e13-4fb0-893c-089c814eef89' },
        { id: '550c068f-b5b8-48a1-9254-d96319e3df43', name: '3,5 kW — 35 m²', min_price: 1400, max_price: 2000, prestation_id: 'd3421bd1-7e13-4fb0-893c-089c814eef89' },
        { id: '26278007-eeea-4a53-ab5f-d475aa9b4e47', name: '5 kW — 50 m²',   min_price: 1800, max_price: 2500, prestation_id: 'd3421bd1-7e13-4fb0-893c-089c814eef89' },
      ],
    },
    {
      id: '113a839f-399c-4bf2-8556-81d1b4c2896f',
      name: 'Installation clim bisplit',
      description: '1 groupe extérieur + 2 unités intérieures.',
      domain_code: 'aircon',
      min_price: 2000,
      max_price: 3500,
      variantes: [
        { id: '7e44d17d-3cf2-4eee-9701-f33c524e1c74', name: '2×2,5 kW', min_price: 2000, max_price: 2800, prestation_id: '113a839f-399c-4bf2-8556-81d1b4c2896f' },
        { id: 'd9f1e775-0e6e-4f89-9ef7-6e18b27fe8b8', name: '2×3,5 kW', min_price: 2500, max_price: 3500, prestation_id: '113a839f-399c-4bf2-8556-81d1b4c2896f' },
      ],
    },
    {
      id: 'ae1fa882-ba49-466b-8d71-9e22ed35fcf8',
      name: 'Installation clim multisplit',
      description: '1 groupe extérieur + 3 unités intérieures ou plus.',
      domain_code: 'aircon',
      min_price: 2800,
      max_price: 5000,
      variantes: [
        { id: '3474fb12-6608-4223-afca-14307fd49601', name: 'Trisplit 3×2,5 kW', min_price: 2800, max_price: 4000, prestation_id: 'ae1fa882-ba49-466b-8d71-9e22ed35fcf8' },
        { id: 'ba4737ea-182a-4991-97a0-1ef312efd7f7', name: 'Quadrisplit',        min_price: 3500, max_price: 5000, prestation_id: 'ae1fa882-ba49-466b-8d71-9e22ed35fcf8' },
      ],
    },
    {
      id: 'adfe9447-bd34-4c7b-942a-8cf2bfcaa4a3',
      name: 'Entretien climatisation',
      description: 'Nettoyage filtres, unités intérieure et extérieure, contrôle fluide.',
      domain_code: 'aircon',
      min_price: 150,
      max_price: 400,
      variantes: [
        { id: 'ea94889c-e2c5-40af-81b1-93c7aebc4b51', name: 'Monosplit (filtres + int.)',  min_price: 150, max_price: 180, prestation_id: 'adfe9447-bd34-4c7b-942a-8cf2bfcaa4a3' },
        { id: '143811c3-e66d-4c46-8842-2957f7e1f399', name: 'Monosplit complet + ext.',    min_price: 170, max_price: 220, prestation_id: 'adfe9447-bd34-4c7b-942a-8cf2bfcaa4a3' },
        { id: '3d288403-2901-4618-8e1f-2d4af2a63cb8', name: 'Bisplit',                     min_price: 200, max_price: 300, prestation_id: 'adfe9447-bd34-4c7b-942a-8cf2bfcaa4a3' },
        { id: '263115a0-723b-4e05-b704-1d7c1841d215', name: 'Trisplit',                    min_price: 280, max_price: 400, prestation_id: 'adfe9447-bd34-4c7b-942a-8cf2bfcaa4a3' },
      ],
    },
    {
      id: 'd38fe887-14bc-4ca7-809a-9821293e1fdb',
      name: 'Dépannage clim — perte de puissance',
      description: 'Diagnostic fuite gaz, compresseur ou carte électronique.',
      domain_code: 'aircon',
      min_price: 200,
      max_price: 800,
      variantes: [
        { id: '920146a8-1f40-4c0f-a9d2-a3152073eebc', name: 'Recharge gaz R410A/R32', min_price: 200, max_price: 400, prestation_id: 'd38fe887-14bc-4ca7-809a-9821293e1fdb' },
        { id: 'eac97613-f3e4-4579-b0d2-98a98ca484fc', name: 'Compresseur HS',         min_price: 300, max_price: 800, prestation_id: 'd38fe887-14bc-4ca7-809a-9821293e1fdb' },
        { id: 'cc2d96b4-b26f-4090-9112-daa19ce08fb1', name: 'Carte électronique',     min_price: 200, max_price: 500, prestation_id: 'd38fe887-14bc-4ca7-809a-9821293e1fdb' },
      ],
    },
    {
      id: '52e5a593-9f23-44ab-8823-1e0d042bfa98',
      name: 'Fuite eau unité intérieure',
      description: 'Nettoyage bac + tuyau de condensats bouché.',
      domain_code: 'aircon',
      min_price: 150,
      max_price: 300,
      variantes: [
        { id: '33967453-d291-4fde-9f5a-b76c41c9390a', name: 'Nettoyage condensats',      min_price: 150, max_price: 200, prestation_id: '52e5a593-9f23-44ab-8823-1e0d042bfa98' },
        { id: '672c8430-9681-451f-8a28-6481e5102bff', name: 'Remplacement pompe relevage', min_price: 200, max_price: 300, prestation_id: '52e5a593-9f23-44ab-8823-1e0d042bfa98' },
      ],
    },
    {
      id: 'ec5c2c85-d73f-4006-a5d7-8573e848073f',
      name: 'Diagnostic bruit clim',
      description: 'Contrôle fixations, ventilateur et compresseur.',
      domain_code: 'aircon',
      min_price: 150,
      max_price: 300,
      variantes: [
        { id: 'bd96bd1c-4f9e-4448-a9bf-bfe9d275a9e4', name: 'Resserrage + vibrations',  min_price: 150, max_price: 180, prestation_id: 'ec5c2c85-d73f-4006-a5d7-8573e848073f' },
        { id: '759f051a-f1ab-41fd-9668-603ea85ee744', name: 'Remplacement ventilateur', min_price: 200, max_price: 300, prestation_id: 'ec5c2c85-d73f-4006-a5d7-8573e848073f' },
      ],
    },
    {
      id: 'ec7ec872-9fce-4957-ad10-0ed620e9cd77',
      name: 'Installation PAC air/air',
      description: 'Pompe à chaleur avec distribution par soufflage d\'air.',
      domain_code: 'aircon',
      min_price: 2500,
      max_price: 8000,
      variantes: [
        { id: '2a661280-2412-418f-9003-f14f8df7f45f', name: 'Monosplit petite surface', min_price: 2500, max_price: 4000, prestation_id: 'ec7ec872-9fce-4957-ad10-0ed620e9cd77' },
        { id: 'a073673e-55f4-4916-8472-5d1ff72383bf', name: 'Multisplit grande surface', min_price: 4000, max_price: 8000, prestation_id: 'ec7ec872-9fce-4957-ad10-0ed620e9cd77' },
      ],
    },
    {
      id: 'be4ed172-e3f9-4c07-b7f8-15196f596fb5',
      name: 'Installation PAC air/eau',
      description: 'PAC avec distribution via radiateurs ou plancher chauffant.',
      domain_code: 'aircon',
      min_price: 7000,
      max_price: 15000,
      variantes: [
        { id: '97c7a71d-0135-41d5-9bda-ee246be6f9aa', name: 'Sur radiateurs',        min_price: 7000,  max_price: 12000, prestation_id: 'be4ed172-e3f9-4c07-b7f8-15196f596fb5' },
        { id: 'a37f3705-23f7-425c-b08b-0bfaa4e143aa', name: 'Sur plancher chauffant', min_price: 10000, max_price: 15000, prestation_id: 'be4ed172-e3f9-4c07-b7f8-15196f596fb5' },
      ],
    },
    {
      id: '58ffa3da-089e-49fe-ab90-bb62b71e7092',
      name: 'Entretien & dépannage PAC',
      description: 'Entretien annuel ou réparation pompe à chaleur.',
      domain_code: 'aircon',
      min_price: 150,
      max_price: 600,
      variantes: [
        { id: '544f786c-21ca-4247-a8d6-6983cd7ccb84', name: 'Entretien annuel PAC', min_price: 150, max_price: 250, prestation_id: '58ffa3da-089e-49fe-ab90-bb62b71e7092' },
        { id: 'e288afb2-9c56-40fa-b424-abd44466a891', name: 'Dépannage panne',      min_price: 200, max_price: 600, prestation_id: '58ffa3da-089e-49fe-ab90-bb62b71e7092' },
        { id: '74853196-93db-4641-a33e-a5732e6c5eaa', name: 'Recharge fluide',      min_price: 200, max_price: 500, prestation_id: '58ffa3da-089e-49fe-ab90-bb62b71e7092' },
      ],
    },
  ],

  /* ─────────────── ÉLECTRICITÉ ─────────────── */
  electricity: [
    {
      id: '59424db3-165c-46a1-b050-28fe19daeea2',
      name: 'Remplacement disjoncteur différentiel',
      description: 'Diagnostic + remplacement du différentiel défaillant.',
      domain_code: 'electricity',
      min_price: 140,
      max_price: 300,
      variantes: [
        { id: '9dc7570d-10a8-4ad2-86e7-61baf7ca8829', name: 'Diagnostic + réarmement',       min_price: 140,  max_price: 200, prestation_id: '59424db3-165c-46a1-b050-28fe19daeea2' },
        { id: '2938d018-73f7-46d8-a003-bbdf6f824a4a', name: 'Remplacement différentiel 25A', min_price: 150, max_price: 220, prestation_id: '59424db3-165c-46a1-b050-28fe19daeea2' },
        { id: '4fab3e64-987f-4d11-8145-95b66c2059eb', name: 'Remplacement différentiel 40A+', min_price: 200, max_price: 300, prestation_id: '59424db3-165c-46a1-b050-28fe19daeea2' },
      ],
    },
    {
      id: 'e2673860-84a6-46ac-9096-1ca610df5aed',
      name: 'Remplacement tableau électrique',
      description: 'Dépose ancien tableau + pose nouveau tableau NF C 15-100.',
      domain_code: 'electricity',
      min_price: 800,
      max_price: 2500,
      variantes: [
        { id: '1d7dbe29-f308-4fc1-91db-38f28db75ebf', name: 'Studio / T1 (4–6 circuits)', min_price: 800,  max_price: 1200, prestation_id: 'e2673860-84a6-46ac-9096-1ca610df5aed' },
        { id: 'cc9c41e4-e2b1-49ed-8b38-a8bd6ccd7402', name: 'T2/T3 (6–10 circuits)',      min_price: 1200, max_price: 1800, prestation_id: 'e2673860-84a6-46ac-9096-1ca610df5aed' },
        { id: 'f026800c-54c4-48f9-bd14-35e7237c92d8', name: 'T4 / maison (10+ circuits)',  min_price: 1800, max_price: 2500, prestation_id: 'e2673860-84a6-46ac-9096-1ca610df5aed' },
      ],
    },
    {
      id: '1617646c-30ba-45e4-8763-667da6de1f25',
      name: 'Panne circuit prises',
      description: 'Diagnostic et réparation d\'un circuit de prises défaillant.',
      domain_code: 'electricity',
      min_price: 150,
      max_price: 300,
      variantes: [
        { id: '7e4da7f2-a6dd-4aa2-962c-0c8779d299e4', name: 'Diagnostic + réarmement',      min_price: 130,  max_price: 200, prestation_id: '1617646c-30ba-45e4-8763-667da6de1f25' },
        { id: '9ea01668-5198-4aa6-8fc3-b767c85b3977', name: 'Réparation fusible/disjoncteur', min_price: 150, max_price: 200, prestation_id: '1617646c-30ba-45e4-8763-667da6de1f25' },
        { id: '8746d89c-ffbf-4266-a10c-20eab8b82db3', name: 'Remplacement câble section',    min_price: 200, max_price: 300, prestation_id: '1617646c-30ba-45e4-8763-667da6de1f25' },
      ],
    },
    {
      id: '0329ad49-3a4d-49f2-8df3-3b79e6a56769',
      name: 'Dépannage circuit éclairage',
      description: 'Vérification circuit éclairage, remplacement interrupteur ou câble.',
      domain_code: 'electricity',
      min_price: 130,
      max_price: 250,
      variantes: [
        { id: '83786ca8-3772-4be4-b875-fa836ae53c2d', name: 'Remplacement interrupteur', min_price: 130,  max_price: 170, prestation_id: '0329ad49-3a4d-49f2-8df3-3b79e6a56769' },
        { id: '81072b26-eef7-4b6b-8779-1d1af0ac90f9', name: 'Réparation circuit complet', min_price: 150, max_price: 250, prestation_id: '0329ad49-3a4d-49f2-8df3-3b79e6a56769' },
      ],
    },
    {
      id: '103bd88e-7925-40ab-8605-98ddd8f66c60',
      name: 'Pose prise / interrupteur',
      description: 'Pose d\'une prise 16A ou d\'un interrupteur va-et-vient.',
      domain_code: 'electricity',
      min_price: 130,
      max_price: 150,
      variantes: [
        { id: '25a0ff24-844f-4b54-9dd4-4006680e5afb', name: 'Prise simple 16A',    min_price: 130,  max_price: 150, prestation_id: '103bd88e-7925-40ab-8605-98ddd8f66c60' },
        { id: 'ed577482-5f45-4297-bded-eed2fe8f2c96', name: 'Prise 2P+T 20A',      min_price: 130, max_price: 150, prestation_id: '103bd88e-7925-40ab-8605-98ddd8f66c60' },
        { id: 'dc4142e7-46d0-40f9-80b1-b1b223f713a4', name: 'Interrupteur double', min_price: 130, max_price: 150, prestation_id: '103bd88e-7925-40ab-8605-98ddd8f66c60' },
      ],
    },
    {
      id: '94a6d587-4078-4cce-ae95-15a4dd6b344d',
      name: 'Pose luminaire / spots',
      description: 'Branchement luminaire ou création de circuit spots encastrés.',
      domain_code: 'electricity',
      min_price: 130,
      max_price: 300,
      variantes: [
        { id: '927e1793-0a11-48f0-9947-7d55baf61a21', name: 'Pose lustre/plafonnier',   min_price: 130,  max_price: 200, prestation_id: '94a6d587-4078-4cce-ae95-15a4dd6b344d' },
        { id: 'fe2632b5-f8a5-4b64-b617-5b420a5d662b', name: 'Kit 3 spots encastrés',    min_price: 180, max_price: 250, prestation_id: '94a6d587-4078-4cce-ae95-15a4dd6b344d' },
        { id: '418e4fdb-349f-4285-a42f-82c3f754ad9d', name: 'Kit 6 spots + variateur',  min_price: 200, max_price: 300, prestation_id: '94a6d587-4078-4cce-ae95-15a4dd6b344d' },
      ],
    },
    {
      id: 'f2f92a94-01dc-4d1e-973b-eb5f75d10282',
      name: 'Installation borne IRVE',
      description: 'Pose borne de recharge véhicule électrique avec mise en service.',
      domain_code: 'electricity',
      min_price: 800,
      max_price: 2000,
      variantes: [
        { id: 'ff14c26a-1581-4b36-a598-f4825156a251', name: 'Wallbox 7 kW (mono)',   min_price: 800,  max_price: 1200, prestation_id: 'f2f92a94-01dc-4d1e-973b-eb5f75d10282' },
        { id: 'c52b8b65-dc5d-48e8-abff-2d776ad3bfa9', name: 'Wallbox 11 kW (tri)',   min_price: 1000, max_price: 1500, prestation_id: 'f2f92a94-01dc-4d1e-973b-eb5f75d10282' },
        { id: '53665d52-8a48-4520-adab-873f9e1e1c51', name: 'Borne avec délestage',  min_price: 1400, max_price: 2000, prestation_id: 'f2f92a94-01dc-4d1e-973b-eb5f75d10282' },
      ],
    },
    {
      id: '860715b4-1aa1-4098-8bf3-fe30cbc3c2b7',
      name: 'Diagnostic électrique',
      description: 'Contrôle conformité NF C 15-100, rapport détaillé.',
      domain_code: 'electricity',
      min_price: 150,
      max_price: 300,
      variantes: [
        { id: 'ace12d7c-f654-4fe5-bfae-363fb426a979', name: 'Appartement < 60 m²',    min_price: 150, max_price: 200, prestation_id: '860715b4-1aa1-4098-8bf3-fe30cbc3c2b7' },
        { id: '31fb3755-f868-4033-b492-29e0974129fd', name: 'Appartement 60–100 m²',  min_price: 180, max_price: 250, prestation_id: '860715b4-1aa1-4098-8bf3-fe30cbc3c2b7' },
        { id: '9221fb0e-11ac-4b73-bd84-7b7e93d3b369', name: 'Maison > 100 m²',        min_price: 250, max_price: 300, prestation_id: '860715b4-1aa1-4098-8bf3-fe30cbc3c2b7' },
      ],
    },
  ],

  /* ─────────────── VITRERIE ─────────────── */
  glazing: [
    {
      id: '587190eb-9411-4379-ad4c-9e865886b980',
      name: 'Remplacement vitre simple',
      description: 'Dépose bris + coupe et pose verre simple.',
      domain_code: 'glazing',
      min_price: 130,
      max_price: 200,
      variantes: [
        { id: 'b3912f96-6032-4ca5-b4e3-48b90b63a00c', name: 'Simple clair',        min_price: 130,  max_price: 150, prestation_id: '587190eb-9411-4379-ad4c-9e865886b980' },
        { id: '2dbd4afa-e2cb-4bb6-bbc1-0498902f5332', name: 'Feuilleté sécurité', min_price: 150, max_price: 280, prestation_id: '587190eb-9411-4379-ad4c-9e865886b980' },
        { id: '0f1745ec-5b3e-439b-95dd-955bb54d4378', name: 'Anti-effraction',    min_price: 200, max_price: 350, prestation_id: '587190eb-9411-4379-ad4c-9e865886b980' },
      ],
    },
    {
      id: '87d73eba-dbd8-47c3-afc7-8c71bd2fc6f9',
      name: 'Fenêtre double vitrage PVC',
      description: 'Remplacement fenêtre PVC double vitrage 4/16/4.',
      domain_code: 'glazing',
      min_price: 350,
      max_price: 600,
      variantes: [
        { id: '053724ec-04d1-420f-aba7-079a29036ec7', name: '60×90 cm',    min_price: 350, max_price: 450, prestation_id: '87d73eba-dbd8-47c3-afc7-8c71bd2fc6f9' },
        { id: '8e943cee-8187-4351-8411-4dc73af160f7', name: '90×120 cm',   min_price: 450, max_price: 550, prestation_id: '87d73eba-dbd8-47c3-afc7-8c71bd2fc6f9' },
        { id: '1c4b9a25-5691-4b85-a31a-f45b522cf325', name: '120×140 cm',  min_price: 500, max_price: 600, prestation_id: '87d73eba-dbd8-47c3-afc7-8c71bd2fc6f9' },
      ],
    },
    {
      id: '006e4534-7a0f-478d-bb2c-291653b416df',
      name: 'Fenêtre double vitrage ALU',
      description: 'Remplacement fenêtre aluminium double vitrage avec RPT.',
      domain_code: 'glazing',
      min_price: 500,
      max_price: 800,
      variantes: [
        { id: '645e8a0b-180c-40a8-b21a-27a6b0807ae9', name: 'Standard',            min_price: 500, max_price: 650, prestation_id: '006e4534-7a0f-478d-bb2c-291653b416df' },
        { id: 'ab39e202-6b17-49aa-a534-7e73fb1c73bb', name: 'RPT haute performance', min_price: 650, max_price: 800, prestation_id: '006e4534-7a0f-478d-bb2c-291653b416df' },
      ],
    },
    {
      id: 'b88e444d-50cf-4711-a7de-ff8709fb0417',
      name: 'Fenêtre double vitrage Bois',
      description: 'Remplacement fenêtre bois lasurée ou peinte.',
      domain_code: 'glazing',
      min_price: 500,
      max_price: 900,
      variantes: [
        { id: '1812db8e-fa70-4432-b96b-a64f86fe25d9', name: 'Bois pin',           min_price: 500, max_price: 700, prestation_id: 'b88e444d-50cf-4711-a7de-ff8709fb0417' },
        { id: '75a0d77b-bacc-405a-88bb-0547262ec922', name: 'Bois chêne / exotique', min_price: 700, max_price: 900, prestation_id: 'b88e444d-50cf-4711-a7de-ff8709fb0417' },
      ],
    },
    {
      id: 'a5239945-44fa-435a-9d39-4b2ccabdacde',
      name: 'Remplacement Velux / fenêtre toit',
      description: 'Dépose + pose fenêtre de toit avec raccord étanchéité.',
      domain_code: 'glazing',
      min_price: 600,
      max_price: 1200,
      variantes: [
        { id: '5e8c3d10-e143-4aed-a3e4-eb9ba25ee663', name: 'Simple vitrage', min_price: 600,  max_price: 800,  prestation_id: 'a5239945-44fa-435a-9d39-4b2ccabdacde' },
        { id: '44015e71-f1a0-470a-9962-8a8cbf810934', name: 'Double vitrage', min_price: 800,  max_price: 1000, prestation_id: 'a5239945-44fa-435a-9d39-4b2ccabdacde' },
        { id: '35038e1d-035d-4ba5-8ce8-e24a0364a152', name: 'Triple vitrage', min_price: 1000, max_price: 1200, prestation_id: 'a5239945-44fa-435a-9d39-4b2ccabdacde' },
      ],
    },
    {
      id: 'd084dbdf-8c92-4698-b7af-9afefdd69ae1',
      name: 'Remplacement crémone',
      description: 'Dépose ancienne crémone + pose crémone compatible.',
      domain_code: 'glazing',
      min_price: 130,
      max_price: 250,
      variantes: [
        { id: 'e55d0029-c510-4e29-afc9-6c722012361a', name: 'Crémone standard',      min_price: 130,  max_price: 150, prestation_id: 'd084dbdf-8c92-4698-b7af-9afefdd69ae1' },
        { id: '70d9414e-2ac5-4e57-acc1-2db396a9af3a', name: 'Crémone multipoints',   min_price: 150, max_price: 250, prestation_id: 'd084dbdf-8c92-4698-b7af-9afefdd69ae1' },
      ],
    },
    {
      id: '8ac1f03a-0ec9-4ae8-a8fc-76a2b918e358',
      name: 'Remplacement poignée fenêtre',
      description: 'Remplacement poignée avec ou sans cylindre de sécurité.',
      domain_code: 'glazing',
      min_price: 120,
      max_price: 200,
      variantes: [
        { id: '5468dffb-0cca-494d-847c-41eed5c54131', name: 'Poignée standard', min_price: 120, max_price: 150,  prestation_id: '8ac1f03a-0ec9-4ae8-a8fc-76a2b918e358' },
        { id: '88fdee70-9504-4b7d-be5f-2e41accfe1d6', name: 'Poignée avec clé',  min_price: 150, max_price: 200, prestation_id: '8ac1f03a-0ec9-4ae8-a8fc-76a2b918e358' },
      ],
    },
    {
      id: 'd87538fa-68c9-4803-9120-9828a1fc1486',
      name: 'Rabotage / réglage fenêtre',
      description: 'Réglage des paumelles, rabotage ou ajustement des joints.',
      domain_code: 'glazing',
      min_price: 120,
      max_price: 200,
      variantes: [
        { id: 'c239f22a-fe3b-411a-b1e5-bc465ee6f31e', name: 'Réglage charnières', min_price: 120,  max_price: 150, prestation_id: 'd87538fa-68c9-4803-9120-9828a1fc1486' },
        { id: '8d420d19-15eb-4f00-8658-2ec76d8ff74c', name: 'Rabotage bois',      min_price: 150, max_price: 200, prestation_id: 'd87538fa-68c9-4803-9120-9828a1fc1486' },
      ],
    },
    {
      id: 'ff650e35-8a6a-4c34-b827-c09d6f8385da',
      name: 'Remplacement joints fenêtre',
      description: 'Dépose anciens joints + pose joints EPDM ou silicone.',
      domain_code: 'glazing',
      min_price: 90,
      max_price: 150,
      variantes: [
        { id: '30d47a11-de5e-4a02-bbb3-f5248c127908', name: 'Joints 1 fenêtre',  min_price: 90,  max_price: 150,  prestation_id: 'ff650e35-8a6a-4c34-b827-c09d6f8385da' },
        { id: '90477644-f006-4950-add4-f649e1ae5ba9', name: 'Joints 3 fenêtres', min_price: 100, max_price: 150, prestation_id: 'ff650e35-8a6a-4c34-b827-c09d6f8385da' },
      ],
    },
  ],

  /* ─────────────── SERRURERIE ─────────────── */
  locksmith: [
    {
      id: 'bd6790b2-0dc4-467d-bdf1-283a8610d59c',
      name: 'Ouverture porte claquée — standard',
      description: 'Ouverture sans dommage par crochetage ou carte.',
      domain_code: 'locksmith',
      min_price: 110,
      max_price: 150,
      variantes: [
        { id: '69faaed6-fbc6-4bd4-99e7-3f38cd1ea781', name: 'Ouverture simple', min_price: 110, max_price: 150, prestation_id: 'bd6790b2-0dc4-467d-bdf1-283a8610d59c' },
      ],
    },
    {
      id: 'f268ee56-9c13-4781-b84b-53cfa4181798',
      name: 'Ouverture porte blindée claquée',
      description: 'Technique non destructive adaptée aux portes renforcées.',
      domain_code: 'locksmith',
      min_price: 150,
      max_price: 400,
      variantes: [
        { id: '3c7d7a34-a697-47e6-a580-34ea829d23cd', name: 'Blindage standard',       min_price: 150, max_price: 175, prestation_id: 'f268ee56-9c13-4781-b84b-53cfa4181798' },
        { id: '53a81400-d306-4fda-b554-220ab9d4c1c2', name: 'Blindage haute sécurité', min_price: 175, max_price: 400, prestation_id: 'f268ee56-9c13-4781-b84b-53cfa4181798' },
      ],
    },
    {
      id: 'a54d59b4-3074-4d9b-bfcd-a0356b5a241d',
      name: 'Ouverture porte verrouillée — standard',
      description: 'Crochetage ou cylindre sacrifié selon serrure.',
      domain_code: 'locksmith',
      min_price: 150,
      max_price: 220,
      variantes: [
        { id: '95fedef9-b8f5-4ae0-8045-9820284fdfa1', name: 'Ouverture sans casse',         min_price: 150, max_price: 180, prestation_id: 'a54d59b4-3074-4d9b-bfcd-a0356b5a241d' },
        { id: '318d12e5-7cef-4a94-abd7-a706165fadf3', name: 'Avec remplacement cylindre',   min_price: 180, max_price: 220, prestation_id: 'a54d59b4-3074-4d9b-bfcd-a0356b5a241d' },
      ],
    },
    {
      id: '96ac9f26-2562-443c-b278-7c6a344fd0fe',
      name: 'Ouverture porte blindée verrouillée',
      description: 'Intervention longue sur serrure multipoints.',
      domain_code: 'locksmith',
      min_price: 200,
      max_price: 350,
      variantes: [
        { id: '0ff9f37d-4d7e-404b-9289-dce0e5ded681', name: '3 points',   min_price: 200, max_price: 800,  prestation_id: '96ac9f26-2562-443c-b278-7c6a344fd0fe' },
        { id: '64d4423e-83e1-4718-9759-7c7f86550d87', name: '5 points A2P', min_price: 280, max_price: 1300, prestation_id: '96ac9f26-2562-443c-b278-7c6a344fd0fe' },
      ],
    },
    {
      id: '5145757c-3834-4c85-b5df-acab24961e4c',
      name: 'Ouverture + sécurisation urgence',
      description: 'Ouverture immédiate + condamnation provisoire de la porte.',
      domain_code: 'locksmith',
      min_price: 200,
      max_price: 400,
      variantes: [
        { id: '3dfb0b13-9a37-466e-88cb-01b9a33682da', name: 'Ouverture + condamnation',       min_price: 200, max_price: 300, prestation_id: '5145757c-3834-4c85-b5df-acab24961e4c' },
        { id: '14c439ed-5d88-49c1-93fb-e41c27119d67', name: '+ Remplacement serrure urgence', min_price: 300, max_price: 400, prestation_id: '5145757c-3834-4c85-b5df-acab24961e4c' },
      ],
    },
    {
      id: 'a1d67dd3-1a33-4dd2-8e34-1538f6def9b2',
      name: 'Changement de cylindre',
      description: 'Dépose ancien cylindre + pose cylindre A2P selon niveau de sécurité.',
      domain_code: 'locksmith',
      min_price: 120,
      max_price: 500,
      variantes: [
        { id: '65457f39-e5e0-41a7-b115-c053e2e7c2a0', name: 'Cylindre standard', min_price: 120, max_price: 180, prestation_id: 'a1d67dd3-1a33-4dd2-8e34-1538f6def9b2' },
        { id: '55480678-9608-4fd3-99b3-88ad9b3c1d0a', name: 'Cylindre A2P 1★',   min_price: 150, max_price: 380, prestation_id: 'a1d67dd3-1a33-4dd2-8e34-1538f6def9b2' },
        { id: '60bb7550-c393-434c-a011-39956ae1ab2f', name: 'Cylindre A2P 2★',   min_price: 180, max_price: 500, prestation_id: 'a1d67dd3-1a33-4dd2-8e34-1538f6def9b2' },
      ],
    },
    {
      id: '0b94f237-6e16-4e78-a954-c33ac1c43bed',
      name: 'Serrure 3 points',
      description: 'Dépose + pose serrure 3 points avec cylindre inclus.',
      domain_code: 'locksmith',
      min_price: 300,
      max_price: 1000,
      variantes: [
        { id: '85c86bf9-79ad-4059-8009-10436534f351', name: 'Entrée de gamme',   min_price: 300, max_price: 500,  prestation_id: '0b94f237-6e16-4e78-a954-c33ac1c43bed' },
        { id: '206cd307-797c-41fb-9efe-d8ca01ef0f5d', name: 'Avec cylindre A2P', min_price: 500, max_price: 1000, prestation_id: '0b94f237-6e16-4e78-a954-c33ac1c43bed' },
      ],
    },
    {
      id: '87c3c65d-10f7-43b6-8838-e1e7b638d71d',
      name: 'Serrure 5 points haute sécurité',
      description: 'Serrure multipoints avec certification A2P BP.',
      domain_code: 'locksmith',
      min_price: 600,
      max_price: 1000,
      variantes: [
        { id: '432fb5c4-9450-47f8-8394-5d602c8a6a50', name: '5 pts A2P BP1', min_price: 600, max_price: 750,  prestation_id: '87c3c65d-10f7-43b6-8838-e1e7b638d71d' },
        { id: '37d3ca8a-3e12-480b-9462-2705dca17f3b', name: '5 pts A2P BP2', min_price: 750, max_price: 900,  prestation_id: '87c3c65d-10f7-43b6-8838-e1e7b638d71d' },
        { id: '803c9ae1-75e0-4b34-adba-cc7f9698ff2f', name: '5 pts A2P BP3', min_price: 900, max_price: 1000, prestation_id: '87c3c65d-10f7-43b6-8838-e1e7b638d71d' },
      ],
    },
    {
      id: '4985f7f7-5049-4151-87cd-a854662a9833',
      name: 'Blindage porte existante',
      description: 'Pose de plaques acier sur porte existante + serrure renforcée.',
      domain_code: 'locksmith',
      min_price: 500,
      max_price: 900,
      variantes: [
        { id: '2dec048c-6ab6-4ca3-8d97-ff4a46b99e44', name: 'Blindage simple acier',    min_price: 500, max_price: 700, prestation_id: '4985f7f7-5049-4151-87cd-a854662a9833' },
        { id: 'bcc20d04-2bd1-4f43-94d5-acbf91d9765b', name: 'Blindage + pivot + 5pts',  min_price: 700, max_price: 900, prestation_id: '4985f7f7-5049-4151-87cd-a854662a9833' },
      ],
    },
    {
      id: '79ec7d8d-dd86-4c0b-a3e4-54578a1ce284',
      name: 'Porte blindée A2P BP',
      description: 'Remplacement complet par porte certifiée A2P.',
      domain_code: 'locksmith',
      min_price: 1000,
      max_price: 3500,
      variantes: [
        { id: '839bcd6c-8c94-4d5e-bfe9-e2c6b06d7c59', name: 'A2P 1★ BP1', min_price: 1000, max_price: 1500, prestation_id: '79ec7d8d-dd86-4c0b-a3e4-54578a1ce284' },
        { id: '2f3af8f3-870c-452c-bda1-4514b663a75f', name: 'A2P 2★ BP2', min_price: 1200, max_price: 1800, prestation_id: '79ec7d8d-dd86-4c0b-a3e4-54578a1ce284' },
        { id: 'ec65be5e-9d89-48a4-a5bb-889c31a72e4e', name: 'A2P 3★ BP3', min_price: 1500, max_price: 3500, prestation_id: '79ec7d8d-dd86-4c0b-a3e4-54578a1ce284' },
      ],
    },
    {
      id: '4a682ba3-524d-4761-b4fe-6e5aa4c9e17d',
      name: 'Serrure boîte aux lettres',
      description: 'Remplacement serrure ou cylindre BAL normalisé.',
      domain_code: 'locksmith',
      min_price: 70,
      max_price: 150,
      variantes: [
        { id: '962eb19c-b540-4973-84fd-40708eb43dea', name: 'Serrure standard',   min_price: 70,  max_price: 100, prestation_id: '4a682ba3-524d-4761-b4fe-6e5aa4c9e17d' },
        { id: 'a59a58bf-0915-4118-aadd-6906215cbf1d', name: 'Cylindre sécurisé',  min_price: 100, max_price: 150, prestation_id: '4a682ba3-524d-4761-b4fe-6e5aa4c9e17d' },
      ],
    },
    {
      id: 'be1da57d-0ae4-40c2-b3d5-27cc893ce837',
      name: 'Serrure portail / garage',
      description: 'Remplacement serrure ou motorisation portail/porte de garage.',
      domain_code: 'locksmith',
      min_price: 150,
      max_price: 350,
      variantes: [
        { id: '7dae9f7c-3b55-4839-90fc-17de1a512ea2', name: 'Serrure portail simple', min_price: 150, max_price: 200, prestation_id: 'be1da57d-0ae4-40c2-b3d5-27cc893ce837' },
        { id: '9a9f0311-4234-4393-944b-04a3df105889', name: 'Motorisation portail',   min_price: 250, max_price: 350, prestation_id: 'be1da57d-0ae4-40c2-b3d5-27cc893ce837' },
      ],
    },
    {
      id: '21288c72-529f-467e-a052-b1672344ddb4',
      name: 'Renforcement de porte',
      description: 'Système pour solidifier et sécuriser une porte contre les intrusions.',
      domain_code: 'locksmith',
      min_price: 250,
      max_price: 450,
      variantes: [
        { id: '0581d04a-86da-42c9-8003-998163d42354', name: 'Renforcement', min_price: 250, max_price: 450, prestation_id: 'ec3c1912-da75-4480-a3c2-974356509baf' },
      ],
    },
    {
      id: 'ec3c1912-da75-4480-a3c2-974356509baf',
      name: 'Blindage de porte',
      description: 'Renforcement en acier d\'une porte pour résister aux effractions.',
      domain_code: 'locksmith',
      min_price: 250,
      max_price: 500,
      variantes: [
        { id: '19d731e6-21d0-4480-92da-589b1a6efaac', name: 'Blindage', min_price: 250, max_price: 500, prestation_id: 'f7a58d9a-738e-4f8d-86e3-69404033777a' },
      ],
    },
    {
      id: '13c96436-6c56-4227-abd8-0c0df0d917e5',
      name: 'Rideaux métalliques',
      description: 'Réparation/installation du rideau métallique.',
      domain_code: 'locksmith',
      min_price: 120,
      max_price: 2000,
      variantes: [
        { id: '4720481c-1f90-4066-b4cf-4d76238f18d0', name: 'Rideaux désaxés', min_price: 180, max_price: 300, prestation_id: '13c96436-6c56-4227-abd8-0c0df0d917e5' },
        { id: '59de0bc5-410b-4276-bae6-311d2865bfb6', name: 'Rideaux bloqués', min_price: 250, max_price: 600, prestation_id: '13c96436-6c56-4227-abd8-0c0df0d917e5' },
        { id: '0b6ba7d1-c8f3-4224-9822-7533e9e0e677', name: 'Moteur électrique ne marche plus', min_price: 150, max_price: 300, prestation_id: '13c96436-6c56-4227-abd8-0c0df0d917e5' },
        { id: '62423bf7-56e5-49ba-94d0-65c797b8a3ca', name: 'Problème de serrure', min_price: 120, max_price: 300, prestation_id: '13c96436-6c56-4227-abd8-0c0df0d917e5' },
        { id: '7040da56-8d4e-457d-85e7-9a634b17bec1', name: 'Rideau à installer', min_price: 1500, max_price: 2000, prestation_id: '13c96436-6c56-4227-abd8-0c0df0d917e5' },
      ],
    },
    {
      id: '9b82f2c5-70ea-4f2e-86f4-97e7624848b6',
      name: 'Volets roulants',
      description: 'Réparation/installation de volet roulant.',
      domain_code: 'locksmith',
      min_price: 200,
      max_price: 950,
      variantes: [
        { id: '730df176-f031-4813-ba15-43f1bade0a99', name: 'Volets roulants désaxés', min_price: 200, max_price: 300, prestation_id: '9b82f2c5-70ea-4f2e-86f4-97e7624848b6' },
        { id: 'fe21345d-7e29-4686-b075-fcd29cf38cae', name: 'Volets roulants à réajuster', min_price: 200, max_price: 350, prestation_id: '9b82f2c5-70ea-4f2e-86f4-97e7624848b6' },
        { id: 'a9bfd625-a1ab-4cf2-b6fe-64ab3ab46b17', name: 'Moteur électrique ne marche plus', min_price: 150, max_price: 300, prestation_id: '9b82f2c5-70ea-4f2e-86f4-97e7624848b6' },
        { id: '44368107-c462-4508-9e2b-a833d6593b34', name: 'Volet roulant à installer', min_price: 350, max_price: 950, prestation_id: '9b82f2c5-70ea-4f2e-86f4-97e7624848b6' },
      ],
    },
    {
      id: '112212ba-4eb1-4593-a56f-24b264763966',
      name: 'Porte blindée',
      description: 'Réparation/installation de porte blindée.',
      domain_code: 'locksmith',
      min_price: 150,
      max_price: 400,
      variantes: [
        { id: 'a48ed22f-9306-4837-bcc0-06a3800d0ce5', name: 'Porte qui accroche', min_price: 150, max_price: 250, prestation_id: '112212ba-4eb1-4593-a56f-24b264763966' },
        { id: '400aab47-2644-4400-8c0e-211b604575b5', name: 'Affaissement de porte ', min_price: 150, max_price: 300, prestation_id: '112212ba-4eb1-4593-a56f-24b264763966' },
        { id: 'a9bfd625-a1ab-4cf2-b6fe-64ab3ab46b17', name: 'Installer les cornières anti-pinces', min_price: 200, max_price: 400, prestation_id: '112212ba-4eb1-4593-a56f-24b264763966' },
      ],
    },
  ],

  /* ─────────────── PLOMBERIE ─────────────── */
  plumbing: [
    {
      id: '78240069-8dd1-4585-bae6-85a83a06017e',
      name: 'Débouchage WC',
      description: 'Intervention avec furet ou pression selon l\'obstruction.',
      domain_code: 'plumbing',
      min_price: 100,
      max_price: 500,
      variantes: [
        { id: '51cfb264-f9c8-426c-9848-8929895623cd', name: 'WC standard (furet)', min_price: 100, max_price: 180, prestation_id: '78240069-8dd1-4585-bae6-85a83a06017e' },
        { id: '6b077f44-aa6b-432e-8ab4-e349ff072578', name: 'WC sanibroyeur',      min_price: 130, max_price: 140, prestation_id: '78240069-8dd1-4585-bae6-85a83a06017e' },
        { id: '9b82fd64-c446-44fc-b968-fc6e0e2f06e0', name: 'Haute pression',      min_price: 300, max_price: 500, prestation_id: '78240069-8dd1-4585-bae6-85a83a06017e' },
      ],
    },
    {
      id: '37c1b99e-3630-4677-bfd1-e100c784e48c',
      name: 'Fuite WC / joint de cuvette',
      description: 'Remplacement joint ou flexible de raccordement.',
      domain_code: 'plumbing',
      min_price: 130,
      max_price: 200,
      variantes: [
        { id: 'bf528b1e-48d8-498b-b407-a91f8c261dde', name: 'Joint simple',    min_price: 130,  max_price: 150, prestation_id: '37c1b99e-3630-4677-bfd1-e100c784e48c' },
        { id: 'c7791977-abd5-465f-a384-4eb359226a42', name: 'Flexible + joint', min_price: 100, max_price: 200, prestation_id: '37c1b99e-3630-4677-bfd1-e100c784e48c' },
      ],
    },
    {
      id: '50fbd6aa-2c6a-4229-9e6e-852b184b35cc',
      name: 'Réparation chasse d\'eau',
      description: 'Remplacement mécanisme de chasse (flotteur, clapet, cloche).',
      domain_code: 'plumbing',
      min_price: 150,
      max_price: 350,
      variantes: [
        { id: '8795b39d-8318-446e-9a28-eeb594077d14', name: 'Remplacement clapet/flotteur', min_price: 150,  max_price: 200, prestation_id: '50fbd6aa-2c6a-4229-9e6e-852b184b35cc' },
        { id: '08026971-f3a9-4344-b583-28c4e12dc5d7', name: 'Mécanisme complet',            min_price: 200, max_price: 350, prestation_id: '50fbd6aa-2c6a-4229-9e6e-852b184b35cc' },
      ],
    },
    {
      id: '94f20494-2dfc-4558-a1ef-f6f0005f5064',
      name: 'Pose WC standard',
      description: 'Dépose ancien WC + fourniture et pose WC posé.',
      domain_code: 'plumbing',
      min_price: 150,
      max_price: 650,
      variantes: [
        { id: 'cbb67960-9012-4564-8619-b1ba13398b61', name: 'Main d\'œuvre seule', min_price: 150, max_price: 350, prestation_id: '94f20494-2dfc-4558-a1ef-f6f0005f5064' },
        { id: '091a38a4-781d-4288-a856-59c7fb2374d7', name: 'Fourniture + pose',   min_price: 300, max_price: 650, prestation_id: '94f20494-2dfc-4558-a1ef-f6f0005f5064' },
      ],
    },
    {
      id: '20c3bd82-fae9-4a25-907d-7e453515afc9',
      name: 'Pose WC suspendu',
      description: 'Bâti support + cuvette suspendue + plaque de commande.',
      domain_code: 'plumbing',
      min_price: 200,
      max_price: 650,
      variantes: [
        { id: '26e41bfc-bc06-49d5-8c89-c5eba692494c', name: 'Bâti + cuvette entrée de gamme', min_price: 200, max_price: 300, prestation_id: '20c3bd82-fae9-4a25-907d-7e453515afc9' },
        { id: '974cbba1-91e8-4bc4-884b-0b3fa25c3a80', name: 'Bâti + cuvette haut de gamme',   min_price: 300, max_price: 400, prestation_id: '20c3bd82-fae9-4a25-907d-7e453515afc9' },
      ],
    },
    {
      id: '2e988f57-6a50-43e2-a951-d43c5d2bbc75',
      name: 'Fourniture + pose sanibroyeur',
      description: 'Installation complète avec évacuation broyée.',
      domain_code: 'plumbing',
      min_price: 1200,
      max_price: 1700,
      variantes: [
        { id: '54bb8cea-3647-40ee-81cf-3fc99761d67d', name: 'Sanibroyeur standard',   min_price: 1200,  max_price: 1300, prestation_id: '2e988f57-6a50-43e2-a951-d43c5d2bbc75' },
        { id: '60e6088b-7965-407d-8c5b-c4d564e0bf8d', name: 'Sanibroyeur silencieux', min_price: 1300, max_price: 1400, prestation_id: '2e988f57-6a50-43e2-a951-d43c5d2bbc75' },
      ],
    },
    {
      id: 'a452da4a-b84a-4448-9a85-3550c86f21a1',
      name: 'Débouchage évier / lavabo',
      description: 'Débouchage par furet spirale ou aspiration haute pression.',
      domain_code: 'plumbing',
      min_price: 140,
      max_price: 180,
      variantes: [
        { id: 'f923989b-1b9c-4af7-8088-4ddba1c9efbf', name: 'Furet manuel',   min_price: 130, max_price: 180, prestation_id: 'a452da4a-b84a-4448-9a85-3550c86f21a1' },
        { id: 'f317085c-a94f-462c-acd3-1635578b1691', name: 'Haute pression',  min_price: 150, max_price: 200, prestation_id: 'a452da4a-b84a-4448-9a85-3550c86f21a1' },
      ],
    },
    {
      id: 'ed7c5a39-5f73-4b8a-897a-4be5659a901e',
      name: 'Fuite canalisation apparente',
      description: 'Remplacement siphon, joint ou section de canalisation visible.',
      domain_code: 'plumbing',
      min_price: 100,
      max_price: 200,
      variantes: [
        { id: '2fcc8b20-71a9-4244-bc52-ef6af6233d33', name: 'Siphon + joints',            min_price: 100,  max_price: 120, prestation_id: 'ed7c5a39-5f73-4b8a-897a-4be5659a901e' },
        { id: '23313cb6-efbc-478e-a4f9-389b61fff598', name: 'Remplacement section tuyau', min_price: 120, max_price: 200, prestation_id: 'ed7c5a39-5f73-4b8a-897a-4be5659a901e' },
      ],
    },
    {
      id: 'ef1c75c8-728d-4dde-8364-6329eb629d91',
      name: 'Changement robinet / mitigeur',
      description: 'Remplacement robinet simple ou mitigeur standard.',
      domain_code: 'plumbing',
      min_price: 130,
      max_price: 500,
      variantes: [
        { id: 'ed6f8a03-1ac5-45f9-9b02-40450e9c3154', name: 'Robinet simple',          min_price: 130,  max_price: 150, prestation_id: 'ef1c75c8-728d-4dde-8364-6329eb629d91' },
        { id: '7b8dd0bc-250c-4cf7-9e33-e71f7aa4b46b', name: 'Mitigeur standard',       min_price: 150, max_price: 350, prestation_id: 'ef1c75c8-728d-4dde-8364-6329eb629d91' },
        { id: 'ac3f3bdc-b07d-4760-94a3-c1ae6505ba97', name: 'Mitigeur thermostatique', min_price: 350, max_price: 500, prestation_id: 'ef1c75c8-728d-4dde-8364-6329eb629d91' },
      ],
    },
    {
      id: 'cd086d16-93d1-4a69-87f6-c29bef64be50',
      name: 'Débouchage douche / baignoire',
      description: 'Nettoyage du siphon et traitement de l\'obstruction.',
      domain_code: 'plumbing',
      min_price: 100,
      max_price: 180,
      variantes: [
        { id: 'b7de2daa-89a0-4300-b725-5309dafcaa68', name: 'Siphon + furet',  min_price: 100, max_price: 140, prestation_id: 'cd086d16-93d1-4a69-87f6-c29bef64be50' },
        { id: '7cf8c598-1e3a-4831-ba99-5b0880373bdb', name: 'Haute pression',  min_price: 140, max_price: 180, prestation_id: 'cd086d16-93d1-4a69-87f6-c29bef64be50' },
      ],
    },
    {
      id: '2b08c7c4-fa1e-46cb-b535-e34ca75428c1',
      name: 'Changement robinet / mitigeur douche',
      description: 'Remplacement mitigeur de douche ou de baignoire.',
      domain_code: 'plumbing',
      min_price: 80,
      max_price: 200,
      variantes: [
        { id: '31342d90-7246-4fd7-8fcf-d171357bddb4', name: 'Mitigeur douche standard', min_price: 100, max_price: 250, prestation_id: '2b08c7c4-fa1e-46cb-b535-e34ca75428c1' },
        { id: 'ad2c0796-48be-4f09-84a6-c9968d394e22', name: 'Mitigeur thermostatique',  min_price: 150, max_price: 500, prestation_id: '2b08c7c4-fa1e-46cb-b535-e34ca75428c1' },
      ],
    },
    {
      id: 'a3271183-e699-4a72-b9b6-818827a635da',
      name: 'Joints silicone douche / baignoire',
      description: 'Dépose anciens joints moisis + nettoyage + joints silicone sanitaire.',
      domain_code: 'plumbing',
      min_price: 80,
      max_price: 150,
      variantes: [
        { id: '75cb9039-b3f7-4831-96a8-76d7370c02ab', name: 'Douche (4 côtés)',   min_price: 80,  max_price: 120, prestation_id: 'a3271183-e699-4a72-b9b6-818827a635da' },
        { id: '94c30f46-db9b-418f-8bba-a6127a673698', name: 'Baignoire complète', min_price: 100, max_price: 150, prestation_id: 'a3271183-e699-4a72-b9b6-818827a635da' },
      ],
    },
    {
      id: '75c85eed-3f42-4348-ae58-8e2f9e158059',
      name: 'Fuite chauffe-eau électrique',
      description: 'Remplacement groupe de sécurité, joint ou anode.',
      domain_code: 'plumbing',
      min_price: 100,
      max_price: 250,
      variantes: [
        { id: '19a2f6c1-bbfb-45f2-9537-f22d15a2b3b6', name: 'Groupe sécurité + joint', min_price: 100, max_price: 150,  prestation_id: '75c85eed-3f42-4348-ae58-8e2f9e158059' },
        { id: 'e9178a93-6cbd-4fe1-87f3-05bba9586e91', name: 'Anode + vérification',    min_price: 120, max_price: 180,  prestation_id: '75c85eed-3f42-4348-ae58-8e2f9e158059' },
        { id: '17e7144c-4892-442b-96c5-7759e8059dec', name: 'Remplacement si nécessaire', min_price: 350, max_price: 1500, prestation_id: '75c85eed-3f42-4348-ae58-8e2f9e158059' },
      ],
    },
    {
      id: '729a55c8-87f1-48dd-bc0a-eb02751783d3',
      name: 'Réparation ballon électrique',
      description: 'Diagnostic résistance, thermostat ou corrosion.',
      domain_code: 'plumbing',
      min_price: 100,
      max_price: 200,
      variantes: [
        { id: 'fc61031b-1c5a-4010-ad42-47b74a57fa2c', name: 'Remplacement résistance', min_price: 100, max_price: 250, prestation_id: '729a55c8-87f1-48dd-bc0a-eb02751783d3' },
        { id: 'a31c6352-3042-4b98-bbf8-9d7c69da34f1', name: 'Thermostat défaillant',   min_price: 100, max_price: 200, prestation_id: '729a55c8-87f1-48dd-bc0a-eb02751783d3' },
        { id: '3db387cd-76a4-4ff1-84f2-36c5d4548531', name: 'Remplacement ballon 80L', min_price: 400, max_price: 600, prestation_id: '729a55c8-87f1-48dd-bc0a-eb02751783d3' },
      ],
    },
    {
      id: 'fd64ca4f-7d48-4e5b-a445-6e58ff9c38ae',
      name: 'Remplacement ballon électrique',
      description: 'Fourniture et pose d\'un nouveau ballon selon capacité.',
      domain_code: 'plumbing',
      min_price: 350,
      max_price: 1500,
      variantes: [
        { id: '7dc37682-23e4-41e7-a89d-7e58a6d85276', name: '50 L (studio)',       min_price: 350, max_price: 500,  prestation_id: 'fd64ca4f-7d48-4e5b-a445-6e58ff9c38ae' },
        { id: '2df49a9e-af66-4390-b838-e604e7f71c8e', name: '80 L (T2/T3)',        min_price: 400, max_price: 600,  prestation_id: 'fd64ca4f-7d48-4e5b-a445-6e58ff9c38ae' },
        { id: '5ffcbe74-619b-4d83-a5e1-9649da9ba59b', name: '150–200 L (maison)',  min_price: 600, max_price: 1500, prestation_id: 'fd64ca4f-7d48-4e5b-a445-6e58ff9c38ae' },
        { id: 'b1c72625-5d13-41cf-9367-aa7bcfcbe176', name: 'Thermodynamique',     min_price: 800, max_price: 1800, prestation_id: 'fd64ca4f-7d48-4e5b-a445-6e58ff9c38ae' },
      ],
    },
    {
      id: '9f1bac72-0a2c-4356-a4df-43ab7b5fd781',
      name: 'Chauffe-eau gaz — diagnostic',
      description: 'Intervention sur chauffe-eau gaz instantané ou à accumulation.',
      domain_code: 'plumbing',
      min_price: 150,
      max_price: 350,
      variantes: [
        { id: '7cbaf333-47ad-4cda-910d-633ce09ea482', name: 'Réparation pièce',                    min_price: 150, max_price: 250,  prestation_id: '9f1bac72-0a2c-4356-a4df-43ab7b5fd781' },
        { id: '1bbd0884-c2bb-41ff-a806-bb450f0109d8', name: 'Remplacement veilleuse/thermocouple', min_price: 100, max_price: 200,  prestation_id: '9f1bac72-0a2c-4356-a4df-43ab7b5fd781' },
        { id: '091dd354-8981-4824-b1e6-ae878147df51', name: 'Remplacement complet',                min_price: 500, max_price: 1000, prestation_id: '9f1bac72-0a2c-4356-a4df-43ab7b5fd781' },
      ],
    },
    {
      id: '1d6385c0-14a7-4c30-a38a-e8ca5365cb18',
      name: 'Fuite canalisation encastrée',
      description: 'Recherche de fuite non destructive + réparation nécessitant ouverture.',
      domain_code: 'plumbing',
      min_price: 500,
      max_price: 1000,
      variantes: [
        { id: '6b9c8b50-eb4b-4969-a119-3aac24aee968', name: 'Recherche électronique seule', min_price: 150, max_price: 300,  prestation_id: '1d6385c0-14a7-4c30-a38a-e8ca5365cb18' },
        { id: 'a18f27c5-f3d4-4ea6-b1f4-1efe1d58a967', name: 'Recherche + réparation',       min_price: 500, max_price: 800,  prestation_id: '1d6385c0-14a7-4c30-a38a-e8ca5365cb18' },
        { id: '805d7aab-1999-4c72-9dd8-0a8072dc26e0', name: 'Réfection carrelage incluse',  min_price: 700, max_price: 1000, prestation_id: '1d6385c0-14a7-4c30-a38a-e8ca5365cb18' },
      ],
    },
    {
      id: '63edf279-94fb-4b17-b9ea-f5a55bd4345d',
      name: 'Débouchage colonne générale',
      description: 'Intervention sur colonne collective avec camion hydrocureur.',
      domain_code: 'plumbing',
      min_price: 700,
      max_price: 900,
      variantes: [
        { id: 'b5484dd0-bbf3-402c-956c-7fad058765de', name: 'Hydrocurage standard',            min_price: 700, max_price: 800, prestation_id: '63edf279-94fb-4b17-b9ea-f5a55bd4345d' },
        { id: '7392dbc4-34c1-4f50-a3a9-63b3139c0390', name: 'Hydrocurage + inspection caméra', min_price: 800, max_price: 900, prestation_id: '63edf279-94fb-4b17-b9ea-f5a55bd4345d' },
      ],
    },
  ],

  /* ─────────────── CHAUFFAGE ─────────────── */
  heating: [
    {
      id: 'b3cf68c1-74c8-4f0f-b2b9-6abb77d9efae',
      name: 'Dépannage chaudière gaz',
      description: 'Diagnostic + réparation selon pièce défaillante.',
      domain_code: 'heating',
      min_price: 150,
      max_price: 500,
      variantes: [
        { id: 'ed24aa7b-bd83-4dc6-8b6d-16957f797e49', name: 'Carte électronique',    min_price: 200, max_price: 500, prestation_id: 'b3cf68c1-74c8-4f0f-b2b9-6abb77d9efae' },
        { id: '3d2781e4-8554-4f71-898b-9e209dacd903', name: 'Brûleur / vanne gaz',   min_price: 150, max_price: 350, prestation_id: 'b3cf68c1-74c8-4f0f-b2b9-6abb77d9efae' },
        { id: '34b72d2c-a811-47be-bf41-b41abba4ccc9', name: 'Circulateur',            min_price: 150, max_price: 300, prestation_id: 'b3cf68c1-74c8-4f0f-b2b9-6abb77d9efae' },
        { id: '14689066-0fbf-462e-8368-73c48b7010d8', name: 'Sonde / thermocouple',   min_price: 100, max_price: 250, prestation_id: 'b3cf68c1-74c8-4f0f-b2b9-6abb77d9efae' },
      ],
    },
    {
      id: '53f5e7f4-b373-4625-b480-0a42ace671eb',
      name: 'Entretien chaudière gaz',
      description: 'Contrôle, nettoyage, réglage combustion + attestation.',
      domain_code: 'heating',
      min_price: 150,
      max_price: 180,
      variantes: [
        { id: '5fc94002-dc6f-4cc1-8135-62157513d789', name: 'Chaudière murale',         min_price: 150, max_price: 170, prestation_id: '53f5e7f4-b373-4625-b480-0a42ace671eb' },
        { id: '6da7b543-c78e-4cfe-8780-c7837901d944', name: 'Chaudière à condensation', min_price: 160, max_price: 180, prestation_id: '53f5e7f4-b373-4625-b480-0a42ace671eb' },
      ],
    },
    {
      id: '7d224674-21ed-4a8e-a196-aa8e727a1a01',
      name: 'Remplacement chaudière gaz standard',
      description: 'Dépose ancienne chaudière + fourniture et pose.',
      domain_code: 'heating',
      min_price: 2000,
      max_price: 3500,
      variantes: [
        { id: '5f99f88e-a6f4-45ff-b28d-212328a12d42', name: '24 kW', min_price: 2000, max_price: 2800, prestation_id: '7d224674-21ed-4a8e-a196-aa8e727a1a01' },
        { id: '6c376b50-a3e2-4e7b-8135-6af1ec5ba8c8', name: '30 kW', min_price: 2500, max_price: 3500, prestation_id: '7d224674-21ed-4a8e-a196-aa8e727a1a01' },
      ],
    },
    {
      id: '35984900-517f-4aa9-8d43-77584c282cbe',
      name: 'Remplacement chaudière condensation',
      description: 'Chaudière à condensation rendement >100% PCI.',
      domain_code: 'heating',
      min_price: 2500,
      max_price: 5000,
      variantes: [
        { id: '7541eadf-3031-4a4d-9072-34f3776cbbfa', name: '24 kW',         min_price: 2500, max_price: 3500, prestation_id: '35984900-517f-4aa9-8d43-77584c282cbe' },
        { id: '628b0f95-6706-463c-a4ad-4fd3fb4b0273', name: '30 kW',         min_price: 3000, max_price: 4500, prestation_id: '35984900-517f-4aa9-8d43-77584c282cbe' },
        { id: '5c3f62eb-3085-426d-84f1-124c199be210', name: '+ régulation',  min_price: 3500, max_price: 5000, prestation_id: '35984900-517f-4aa9-8d43-77584c282cbe' },
      ],
    },
    {
      id: 'a4704735-1a9a-4093-9c4d-900b4d3417ad',
      name: 'Purge radiateurs + équilibrage circuit',
      description: 'Purge de l\'air emprisonné dans les radiateurs et équilibrage.',
      domain_code: 'heating',
      min_price: 80,
      max_price: 400,
      variantes: [
        { id: 'f4c18f30-bce1-4082-9497-00d5f050e4c6', name: 'Purge 1 radiateur',    min_price: 80,  max_price: 120, prestation_id: 'a4704735-1a9a-4093-9c4d-900b4d3417ad' },
        { id: 'b6ba1fa5-c754-40e7-bf4a-80e69b9eb07e', name: 'Purge circuit complet', min_price: 150, max_price: 300, prestation_id: 'a4704735-1a9a-4093-9c4d-900b4d3417ad' },
        { id: 'b52765ea-08ac-44c9-9d0e-9ca6386d790f', name: 'Désembouage complet',   min_price: 300, max_price: 600, prestation_id: 'a4704735-1a9a-4093-9c4d-900b4d3417ad' },
      ],
    },
    {
      id: '909f4bfb-1d9b-45de-9978-bf9adfbf003a',
      name: 'Remplacement robinet thermostatique',
      description: 'Dépose ancien robinet + pose robinet thermostatique.',
      domain_code: 'heating',
      min_price: 100,
      max_price: 200,
      variantes: [
        { id: '5111e5c4-a9fe-4db1-8e93-75f2db60821d', name: 'Robinet standard', min_price: 100, max_price: 150, prestation_id: '909f4bfb-1d9b-45de-9978-bf9adfbf003a' },
        { id: 'e2baba51-f5a8-4f8b-b9be-420edf6e50df', name: 'Tête connectée',   min_price: 150, max_price: 200, prestation_id: '909f4bfb-1d9b-45de-9978-bf9adfbf003a' },
      ],
    },
    {
      id: '4d58e619-0d36-4819-b865-d507955efb50',
      name: 'Pose radiateur chauffage central',
      description: 'Raccordement + pose radiateur sur circuit existant.',
      domain_code: 'heating',
      min_price: 250,
      max_price: 400,
      variantes: [
        { id: 'd853d6c0-6a76-486b-8399-51dec2d8ba39', name: 'Radiateur acier standard', min_price: 250, max_price: 350, prestation_id: '4d58e619-0d36-4819-b865-d507955efb50' },
        { id: '567f8d89-38ac-4cf6-bf94-992d7ff5c501', name: 'Radiateur fonte',          min_price: 300, max_price: 400, prestation_id: '4d58e619-0d36-4819-b865-d507955efb50' },
      ],
    },
    {
      id: '86e407d0-12a6-4aa5-8a4b-8bfeaf9af510',
      name: 'Entretien chaudière fioul',
      description: 'Contrôle, nettoyage brûleur et échangeur, ramonage + attestation.',
      domain_code: 'heating',
      min_price: 150,
      max_price: 200,
      variantes: [
        { id: 'e651b62a-4532-4712-b461-b5872be1ccea', name: 'Entretien standard',    min_price: 150, max_price: 180, prestation_id: '86e407d0-12a6-4aa5-8a4b-8bfeaf9af510' },
        { id: 'fbb02332-bd33-4c4d-bb54-d7bdf5036ad2', name: 'Entretien + ramonage',  min_price: 180, max_price: 200, prestation_id: '86e407d0-12a6-4aa5-8a4b-8bfeaf9af510' },
      ],
    },
    {
      id: 'e6e29722-28d0-4a58-9255-8d77e96a6a75',
      name: 'Réparation chaudière fioul',
      description: 'Diagnostic + réparation brûleur, pompe à fioul ou carte.',
      domain_code: 'heating',
      min_price: 200,
      max_price: 600,
      variantes: [
        { id: '9154258c-06e7-4e3e-a6a9-53a62ba3e26b', name: 'Brûleur',            min_price: 200, max_price: 400, prestation_id: 'e6e29722-28d0-4a58-9255-8d77e96a6a75' },
        { id: '25dbb4dc-9b6e-4a4a-883b-3e4e2da274a6', name: 'Pompe à fioul',      min_price: 200, max_price: 350, prestation_id: 'e6e29722-28d0-4a58-9255-8d77e96a6a75' },
        { id: 'f305bb32-70ce-46f5-a348-d2f583192d21', name: 'Carte électronique', min_price: 300, max_price: 600, prestation_id: 'e6e29722-28d0-4a58-9255-8d77e96a6a75' },
      ],
    },
  ],
}

export function hasCatalog(category: InterventionCategory): boolean {
  const c = PRESTATIONS_CATALOG[category]
  return !!(c && c.length > 0)
}

export function getPrestations(category: InterventionCategory): Prestation[] {
  return PRESTATIONS_CATALOG[category] ?? []
}

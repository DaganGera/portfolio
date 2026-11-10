/*
  Everything the site says lives in this file.

  To add a flagship project: append to `flagships`. Pick a `world` (colour set)
  and a `specimen` (the 3D object). Reuse one of the existing specimens, or use
  'none' to run the chapter with type and colour only.

  To add a smaller project: append to `more`.
*/

export type WorldKey = 'scale' | 'temper' | 'agar' | 'skin' | 'mask' | 'sprout';
export type SpecimenKey = 'plate' | 'dish' | 'onion' | 'drive' | 'none';

export interface World {
  ground: string; // background flood
  ink: string; // text
  accent: string; // giant title, highlights, rim light on the specimen
  soft: string; // hairlines, quiet text
}

/* Each colour set is taken from the thing its project looks at. */
export const worlds: Record<WorldKey, World> = {
  // the pale inner scale of a red onion
  scale: { ground: '#EDE3EA', ink: '#2A1023', accent: '#8E2A60', soft: '#BFA5B6' },
  // oxide colours on tempered steel: blue at 300 C, straw at 220 C
  temper: { ground: '#1D3657', ink: '#E8EEF5', accent: '#EDCB6B', soft: '#5C7BA3' },
  // nutrient agar and the colony growing on it
  agar: { ground: '#E3A534', ink: '#16201C', accent: '#0E5A53', soft: '#9C6D17' },
  // the papery outer skin of a red onion, with a green shoot
  skin: { ground: '#4A1237', ink: '#F5DFEC', accent: '#C6D63A', soft: '#9B5A82' },
  // solder mask and bare copper pads
  mask: { ground: '#0E4536', ink: '#E7F1EA', accent: '#F0A23B', soft: '#4F8A76' },
  // the shoot on its own
  sprout: { ground: '#C6D63A', ink: '#2A1023', accent: '#4A1237', soft: '#7F8C1C' },
};

export interface Stat {
  value: string;
  label: string;
}
export interface Figure {
  src: string;
  caption: string;
}
export interface Flagship {
  id: string;
  title: string[]; // lines of the giant title
  what: string; // one line: what kind of thing this is
  claim: string;
  stats: Stat[];
  links: { label: string; href: string }[];
  world: WorldKey;
  specimen: SpecimenKey;
  status?: string;
  details: string[];
  figures: Figure[];
}

export const person = {
  name: ['Marcben', 'James', 'Samuel'],
  intro:
    'I build vision models that find what is wrong with things: defects in steel, parasites in blood, rot in onions, hard drives about to fail.',
  where: 'Chennai, India',
  study: 'B.Tech in artificial intelligence and data science, class of 2028',
  email: 'marcbenjames007@gmail.com',
  phone: '+91 95511 80516',
  github: 'https://github.com/DaganGera',
  githubHandle: 'DaganGera',
  linkedin: 'https://www.linkedin.com/in/marcben-james-samuel-117405385',
  resume: '/files/Marcben-James-Samuel-Resume.pdf',
};

export const flagships: Flagship[] = [
  {
    id: 'spot-tap',
    title: ['SPOT-TAP'],
    what: 'Few-shot defect-type classification',
    claim:
      'Names the type of a defect after seeing a handful of boxed examples. CLIP and DINOv2 stay frozen; a small patch head trains on the support set in seconds.',
    stats: [
      { value: '+11.2', label: 'points over its training-free counterpart, p = 2.5 × 10⁻⁹' },
      { value: '29%', label: 'of the backbone compute of the fine-tuned baseline it ties, with no query masks' },
      { value: '4', label: 'fresh benchmarks, each scored once after the design was fixed' },
    ],
    links: [{ label: 'Paper repository', href: 'https://github.com/DaganGera/SPOT-TAP' }],
    world: 'temper',
    specimen: 'plate',
    status: 'First-author paper, under review',
    details: [
      'Inspection often has to name the type of a defect after seeing only a few labelled examples. The method this builds on is accurate, but it needs a pixel mask of every query defect, a mask-aware CLIP variant and 27 views per query.',
      'SPOT-TAP works in a lighter setting. Support images carry bounding boxes, and the query carries a box or nothing at all. It combines zero-shot text similarity and a box-prototype patch contrast with a small cosine patch classifier per backbone.',
      'Two ideas carry most of the gain. Support defects are pasted into other support images, which supplies extra positive patches. A text gate turns down class prompts that prove unreliable on the support set.',
      'Every design choice and hypothesis was fixed on three development domains before four fresh benchmarks were scored once. The gated model beats zero-shot CLIP, prototype and Tip-Adapter classifiers on the same features by 13.8 to 47.6 points.',
      'Data: VarroaDataset, BBBC041, MVTec-FS, NEU-DET, PCB defects, MTD and AITEX. With Raghul S, S. Sumathi and Sam V. George.',
    ],
    figures: [
      { src: '/img/spot_overview.webp', caption: 'Support set built once per task, then each query scored in about 0.13 s.' },
      { src: '/img/spot_examples.webp', caption: 'One support example per defect type, across steel, circuit boards, tiles, fabric, bottles, blood cells and honeybees.' },
    ],
  },
  {
    id: 'emergent-attention',
    title: ['Emergent attention'],
    what: 'A neural cellular automaton in place of self-attention',
    claim:
      'The first six attention blocks of a vision transformer are replaced by one small local rule, applied again and again, so that global structure has to emerge.',
    stats: [
      { value: '81.91%', label: 'top-1 on CIFAR-100 with 6.46M parameters. Swin-Tiny: 81.56% with 27.60M' },
      { value: '19', label: 'corruption types on CIFAR-100-C, with the highest mean accuracy of five models' },
      { value: '+13.4', label: 'points of balanced accuracy on breast ultrasound over a matched DeiT-Tiny, three seeds' },
    ],
    links: [{ label: 'Code and paper', href: 'https://github.com/DaganGera/Emergent-Attention' }],
    world: 'agar',
    specimen: 'dish',
    details: [
      'Self-attention lets every patch look at every other patch in one step. This project asks how far a model gets when it cannot: each cell sees only its neighbours, and the same small rule runs many times.',
      'In the hybrid model, an iterative neural cellular automaton stands in for the first six attention blocks of a ViT. It reaches 81.91% top-1 on CIFAR-100 with 6.46M parameters, against 81.56% for Swin-Tiny with 27.60M.',
      'Local rules also degrade more gracefully. Across the 19 corruptions of CIFAR-100-C the hybrid has the highest mean accuracy of the five models compared.',
      'On an imbalanced breast-ultrasound set, three-seed balanced accuracy rises from 36.4% to 49.8% over a matched DeiT-Tiny baseline.',
      'The dish on this page runs a classic reaction-diffusion system, not the trained model. It is here because it shows the same idea: nothing but neighbours, and structure anyway.',
    ],
    figures: [
      { src: '/img/ea_arch.webp', caption: 'The hybrid: cellular automaton blocks first, attention after.' },
      { src: '/img/ea_robust.webp', caption: 'Accuracy under the 19 corruptions of CIFAR-100-C.' },
      { src: '/img/ea_gradcam.webp', caption: 'Where the model looks on a benign ultrasound case.' },
    ],
  },
  {
    id: 'prga',
    title: ['PRGA'],
    what: 'Prompt-grounded region graph adapter',
    claim:
      'Learns a new inspection task from one to sixteen photos per class. A 1.1M-parameter graph links the regions of each photo to written descriptions of the classes; CLIP, DINOv2 and OWLv2 stay frozen.',
    stats: [
      { value: '0.985', label: 'macro-F1 on 7,612 held-out onion photos' },
      { value: '0.813', label: 'macro-F1 from a single photo per class' },
      { value: '584', label: 'leaked photos found and removed before any model was scored' },
    ],
    links: [{ label: 'Code and results', href: 'https://github.com/DaganGera/onion_research' }],
    world: 'skin',
    specimen: 'onion',
    details: [
      'The work started with an audit. In the public 12,260-photo onion dataset, the same onions appeared in both the training and the test split. I removed 27 exact and 557 near-duplicate photos and rebuilt the split from 79,194 verified same-scene pairs, so no scene sits on both sides.',
      'On that clean split I replicated the base paper and its ablations, then ran more than ten published methods under one protocol: macro-F1 as mean and standard deviation over three support sets, every choice made on validation data, the test set used once per configuration.',
      'PRGA builds a small graph for each photo. Its nodes are the whole photo, the object, up to two parts and two suspicious spots found by OWLv2, plus one text node per class written before any results were seen. Two gated graph-attention layers turn that into class prototypes specific to the photo.',
      'The same model is evaluated on three domains with leak-free splits: onion bulbs, Varroa mites on honeybees filmed in unseen videos, and six defect types on steel strip.',
    ],
    figures: [
      { src: '/img/prga_arch.webp', caption: 'Photo, region and text nodes joined in one graph.' },
      { src: '/img/prga_f1.webp', caption: 'Macro-F1 against the number of photos per class.' },
      { src: '/img/prga_dupes.webp', caption: 'Near-duplicate pairs removed during the audit.' },
    ],
  },
  {
    id: 'syshealth',
    title: ['SysHealth+'],
    what: 'Predicts drive failure before it happens',
    claim:
      'Trained on about 10 GB of Backblaze drive telemetry, where failures are under one percent of the rows, then shipped as a live monitor that learns the baseline of the machine it runs on.',
    stats: [
      { value: 'Winner', label: 'of a national hackathon' },
      { value: '<1%', label: 'of rows are failures, handled with class weights and scored on PR-AUC' },
      { value: '36', label: 'stars on GitHub' },
    ],
    links: [{ label: 'Code', href: 'https://github.com/DaganGera/Sys-Health' }],
    world: 'mask',
    specimen: 'drive',
    details: [
      'Remaining useful life is labelled from the SMART time series of each drive, across 92 CSV files processed in chunks. Drives that never failed are treated as censored instead of being thrown away.',
      'An XGBoost classifier predicts failure on a label with well under one percent positives, using a stratified split, class weighting and PR-AUC. A random-forest regressor estimates the days left, scored with MAE and RMSE.',
      'The desktop monitor polls SMART attributes in background threads, flags deviations from what the machine has learned is normal for itself, and tracks wear on CPU, GPU, memory and disks.',
      'An offline Mistral assistant explains each fault in plain language from the live telemetry, so nothing leaves the computer.',
    ],
    figures: [],
  },
];

export interface MoreItem {
  name: string;
  line: string;
  stack: string;
  href?: string;
  note?: string;
}

export const more: MoreItem[] = [
  {
    name: 'PhishGuard',
    line: 'Scores URLs, emails, QR codes and voice calls for phishing, behind a live threat dashboard and a Chrome extension.',
    stack: 'XGBoost, FastAPI, Redis, Whisper',
    href: 'https://github.com/DaganGera/PhishGuard',
  },
  {
    name: 'MediKiosk',
    line: 'A clinical history-taking kiosk that listens, reads prescriptions and answers in 22 Indian languages with no internet. 294 passing tests.',
    stack: 'Whisper, Qwen2.5, ONNX',
    href: 'https://github.com/DaganGera/Patient-Case-Taking',
  },
  {
    name: 'SHOAL',
    line: 'Turns raw underwater video into fish tracks, then into abundance and diversity figures a marine scientist already uses.',
    stack: 'Detection, tracking, Streamlit',
    href: 'https://github.com/DaganGera/shoal',
  },
  {
    name: 'KalaiSol',
    line: 'A Tamil technical lexicon and writing assistant built from the scanned government dictionary. The core runs with zero model calls.',
    stack: 'OCR, Aho-Corasick, Next.js',
    href: 'https://github.com/DaganGera/TossConf',
  },
  {
    name: 'NEXUS',
    line: 'Retrieves text, images and audio from one shared embedding space and cites its sources. About 83% top-5 retrieval accuracy.',
    stack: 'CLIP, Whisper, FastAPI, Docker',
  },
  {
    name: 'SafeLobby',
    line: 'A toxicity classifier for in-game chat, audited for identity bias. A small ONNX model handles most messages and only borderline ones reach the LLM.',
    stack: 'QLoRA, ONNX, FastAPI',
    note: 'In progress',
  },
  {
    name: 'GestureCanvas',
    line: 'Draw in the air with your hand. A convolutional network trained from scratch reads ten gestures from a webcam.',
    stack: 'PyTorch, OpenCV',
    href: 'https://github.com/DaganGera/GestureNet',
  },
];

export const record = {
  work: [
    {
      role: 'Backend database and ML engineering intern',
      place: 'LGTG Solutions',
      when: 'Jan to Feb 2026',
      line: 'Built an offline government voice assistant that answers citizens in Tamil, Hindi and English, and cut its average response time from 252 ms to 61 ms.',
    },
    {
      role: 'Software and data engineering intern',
      place: 'Altascio Technologies',
      when: 'Dec 2025',
      line: 'Cleaned production datasets and engineered features for machine-learning workflows.',
    },
    {
      role: 'Data analytics intern',
      place: 'IQmath Technologies',
      when: 'Dec 2025',
      line: 'Analysed multi-source business data in Python and SQL and built dashboards for non-technical teams.',
    },
  ],
  study: {
    place: "St. Joseph's College of Engineering, Chennai",
    line: 'B.Tech in artificial intelligence and data science. CGPA 8.78 of 10. Graduating May 2028.',
  },
  honours: [
    'National hackathon winner, Cyber Guardians ’26, Vel Tech',
    'Best project award, New Prince College, 2025',
    'First place, IEEE quiz, 2025',
    'President of the Data Analytics Club: ran EDA-thon and organised Impact AI-Thon ’26',
  ],
  certificates: [
    'Microsoft Certified: Azure AI Fundamentals, 2026',
    'Introduction to Machine Learning, NPTEL, Elite',
    'Python for Data Science, NPTEL, Silver',
    'Data Science Foundation, Coursera',
  ],
  paper:
    'Marcben James Samuel S, Raghul S, S. Sumathi, Sam V. George. SPOT-TAP: Box-supervised few-shot defect-type classification with frozen foundation models and a support-trained patch head. Under review, 2026.',
};

export const offHours = [
  {
    name: 'Oddly True',
    line: 'Strange true stories told as short paper-cutout cartoons. I write, animate and score them.',
    href: 'https://www.youtube.com/@OddlyTrueToons',
    cta: 'Watch on YouTube',
  },
  {
    name: 'Markow Studios',
    line: 'A small freelance studio in Chennai: websites, posters and automation for local businesses.',
    href: 'https://github.com/DaganGera/portfolio-freelance',
    cta: 'See the studio site code',
  },
];

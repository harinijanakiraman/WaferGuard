export type QualityClass =
  | 'Excellent'
  | 'Acceptable'
  | 'Watch'
  | 'At Risk'
  | 'Reject for Review';

export type DieStatus =
  | 'good'
  | 'minor_concern'
  | 'warning'
  | 'probable_defect'
  | 'severe_defect';

export type DefectCategory =
  | 'Particle contamination'
  | 'Lithography misalignment'
  | 'Critical-dimension variation'
  | 'Scratch'
  | 'Edge damage'
  | 'Cluster defect'
  | 'Random defect'
  | 'Pattern distortion'
  | 'Environmental excursion'
  | 'Unknown or insufficient data';

export type DefectNature =
  | 'predicted'
  | 'observed'
  | 'confirmed'
  | 'unknown';

export type DefectPattern =
  | 'Random'
  | 'Edge-ring'
  | 'Center'
  | 'Scratch'
  | 'Cluster'
  | 'Donut'
  | 'Localized contamination';

export type ParamStatus = 'normal' | 'warning' | 'critical';

export interface MainParameters {
  particleContamination: number; // particles/cm²
  lithoAlignmentError: number; // nm
  cdDeviation: number; // nm
  temperature: number; // °C
  relativeHumidity: number; // %
}

export interface ParamConstraintConfig {
  key: keyof MainParameters;
  label: string;
  unit: string;
  description: string;
  min: number;
  max: number;
  normalMin: number;
  normalMax: number;
  warningMin: number;
  warningMax: number;
  weight: number;
}

export type ProcessStageCategory = 'FEOL' | 'MOL' | 'BEOL';

export interface WaferLayerConfig {
  id: string; // e.g. 'L1-SUBSTRATE', 'L2-FIN', 'L3-GATE', 'L4-CONTACT', 'L5-M1', 'L6-M2', 'L7-PAD'
  name: string;
  shortCode: string;
  category: ProcessStageCategory;
  stackOrder: number; // 1 (bottom) to 7 (top)
  thicknessNm: number;
  criticalFeatureNm: number; // CD target in nm
  overlayToleranceNm: number; // Litho overlay budget in nm
  baseDefectRate: number; // baseline % under ideal nominal conditions
  sensitivities: {
    particle: number;
    lithoOverlay: number;
    cdVariation: number;
    temperature: number;
    relativeHumidity: number;
  };
  dominantDefectTypes: DefectCategory[];
  cleanroomBay: string;
  toolType: string;
  colorHex: string;
  metallic: number;
  roughness: number;
  opacity: number;
  description: string;
}

export interface WaferLayerRun {
  layerConfig: WaferLayerConfig;
  defectRate: number; // %
  dieYield: number; // %
  goodDies: number;
  defectiveDies: number;
  minorConcernDies: number;
  warningDies: number;
  dominantDefectCategory: DefectCategory;
  dominantPattern: DefectPattern;
  dies: Die[];
  overlayErrorAverageNm: number;
  cdDeviationAverageNm: number;
  killerDefectCount: number;
  layerHealthScore: number; // 0-100
  propagatedDefectCount: number;
}

export type CpuBinGrade = 'i9' | 'i7' | 'i5' | 'i3' | 'Reject';

export interface CpuBinConfig {
  grade: CpuBinGrade;
  name: string;
  badgeColor: string;
  textColor: string;
  bgHex: string;
  minClockGhz: number;
  maxClockGhz: number;
  activeCores: number;
  marketPriceUsd: number;
  description: string;
}

export interface WaferBinSummary {
  i9Count: number;
  i7Count: number;
  i5Count: number;
  i3Count: number;
  rejectCount: number;
  i9Yield: number; // %
  i7Yield: number; // %
  i5Yield: number; // %
  i3Yield: number; // %
  harvestYield: number; // % (i9 + i7 + i5 + i3)
  scrapRate: number; // %
  totalSiliconValueUsd: number;
  averageDieValueUsd: number;
}

export interface Die {
  id: string;
  col: number;
  row: number;
  posXmm: number;
  posYmm: number;
  distFromCenterMm: number;
  isEdgeExclusion: boolean;
  isValid: boolean;
  status: DieStatus;
  defectCategory: DefectCategory | null;
  defectNature: DefectNature;
  defectReason: string;
  severity: number; // 0 to 1
  elevation: number; // for 3D
  measuredCD: number; // nm
  overlayError: number; // nm
  layerId?: string;
  propagatedFromLayer?: string;
  // CPU Die Binning
  binGrade?: CpuBinGrade;
  binClockGhz?: number;
  binActiveCores?: number;
  binValueUsd?: number;
  binReason?: string;
}

export interface Wafer {
  id: string;
  batchId: string;
  waferDiameterMm: number; // 200, 300, 450
  gridRows: number;
  gridCols: number;
  dieSizeMm: { x: number; y: number };
  edgeExclusionMm: number;
  processLayer: string;
  activeLayerId?: string;
  layers?: WaferLayerRun[];
  parameters: MainParameters;
  totalDies: number;
  goodDies: number;
  minorConcernDies: number;
  warningDies: number;
  defectiveDies: number;
  defectRate: number; // %
  dieYield: number; // %
  qualityClass: QualityClass;
  confidence: number; // %
  dominantDefectPattern: DefectPattern;
  dominantDefectCategory: DefectCategory;
  mostInfluentialParameter: string;
  classificationReasons: string[];
  dies: Die[];
  isTestWafer: boolean;
  notes?: string;
  createdAt: string;
  binSummary?: WaferBinSummary;
}

export interface Batch {
  id: string;
  name: string;
  testWaferId: string;
  batchSize: number;
  wafers: Wafer[];
  avgYield: number;
  avgDefectRate: number;
  criticalWafersCount: number;
  mostCommonDefect: string;
  mostInfluentialParam: string;
  createdAt: string;
  batchBinSummary?: WaferBinSummary;
}

export interface ConstraintProfile {
  id: string;
  name: string;
  version: string;
  processNode: '28nm Planar' | '14nm FinFET' | '7nm FinFET' | '5nm GAA' | '3nm GAA';
  waferDiameterMm: number;
  dieSizeMm: { x: number; y: number };
  edgeExclusionMm: number;
  defectDensityLimit: number; // defects/cm²
  modelConfidenceThreshold: number; // %
  randomNoiseLevel: number; // 0 - 1
  paramConfigs: Record<keyof MainParameters, ParamConstraintConfig>;
  severityWeights: {
    minor: number;
    warning: number;
    probable: number;
    severe: number;
  };
  batchVariationStdDev: number;
  batchDriftTrend: number;
  notes: string;
  approvalStatus: 'Draft' | 'Approved' | 'Review Required';
  lastUpdated: string;
  isDefault: boolean;
}

export interface DefectReductionAction {
  id: string;
  urgency:
    | 'Immediate containment'
    | 'Process investigation'
    | 'Corrective action'
    | 'Verification on the next test layer';
  suspectedCause: string;
  evidence: string;
  affectedWafers: string[];
  affectedDiesCount: number;
  confidenceScore: number;
  recommendedAction: string;
  expectedEffect: string;
  verificationStep: string;
  status: 'Pending Review' | 'Approved' | 'Executed' | 'Dismissed';
}

export interface CleanroomZone {
  id: string;
  name: string;
  bayNumber: string;
  isoClass: string;
  temperatureC: number;
  tempStatus: ParamStatus;
  relativeHumidityPct: number;
  rhStatus: ParamStatus;
  particleCount: number; // particles/m3 >=0.1um
  particleStatus: ParamStatus;
  airflowVelocityMps: number;
  pressureDiffPa: number;
  alertLevel: 'normal' | 'warning' | 'critical';
  activeTool: string;
  toolStatus: 'Operational' | 'Warning' | 'Maintenance' | 'Calibrating';
  recentExcursionsCount: number;
  coordinates: { x: number; z: number };
}

export interface EnvironmentalExcursion {
  id: string;
  timestamp: string;
  zoneId: string;
  zoneName: string;
  parameter: string;
  measuredValue: string;
  thresholdValue: string;
  severity: 'Warning' | 'Critical';
  potentialWaferImpact: string;
  status: 'Active' | 'Investigating' | 'Resolved';
}

export interface AnalysisHistoryRecord {
  id: string;
  timestamp: string;
  operator: string;
  waferId: string;
  batchId: string;
  numberOfWafers: number;
  constraintProfileVersion: string;
  parameters: MainParameters;
  goodDieCount: number;
  defectiveDieCount: number;
  defectRate: number;
  yield: number;
  classification: QualityClass;
  dominantDefectType: string;
  recommendations: string[];
  modelVersion: string;
  inputFileName?: string;
  testWafer: Wafer;
  batchWafers?: Wafer[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  user: string;
  previousValue?: string;
  newValue?: string;
}

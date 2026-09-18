import {
  Wafer,
  Batch,
  Die,
  MainParameters,
  ConstraintProfile,
  QualityClass,
  DieStatus,
  DefectCategory,
  DefectPattern,
  DefectNature,
  ParamStatus,
  WaferLayerConfig,
  WaferLayerRun,
  CpuBinGrade,
  CpuBinConfig,
  WaferBinSummary,
} from '../types';
import { PROCESS_LAYER_DEFINITIONS } from './presets';

export const CPU_BIN_CONFIGS: Record<CpuBinGrade, CpuBinConfig> = {
  i9: {
    grade: 'i9',
    name: 'Intel Core i9 (Halo / Flagship)',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    textColor: 'text-emerald-600',
    bgHex: '#10b981',
    minClockGhz: 5.8,
    maxClockGhz: 6.0,
    activeCores: 24, // 8P + 16E
    marketPriceUsd: 589,
    description: 'Pristine silicon with 0 fatal defects. Full 24 cores active, unlocked 6.0 GHz Thermal Velocity Boost.',
  },
  i7: {
    grade: 'i7',
    name: 'Intel Core i7 (Enthusiast)',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-300',
    textColor: 'text-cyan-600',
    bgHex: '#06b6d4',
    minClockGhz: 5.4,
    maxClockGhz: 5.6,
    activeCores: 20, // 8P + 12E
    marketPriceUsd: 399,
    description: 'High-performance enthusiast tier with 20 active cores, 5.6 GHz turbo boost. Minor non-critical variance.',
  },
  i5: {
    grade: 'i5',
    name: 'Intel Core i5 (Mainstream)',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    textColor: 'text-indigo-600',
    bgHex: '#6366f1',
    minClockGhz: 5.0,
    maxClockGhz: 5.3,
    activeCores: 14, // 6P + 8E
    marketPriceUsd: 239,
    description: 'Volume mainstream market tier with 14 active cores, partial cache harvest. Moderate frequency scaling.',
  },
  i3: {
    grade: 'i3',
    name: 'Intel Core i3 (Entry / Harvest)',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-300',
    textColor: 'text-amber-600',
    bgHex: '#f59e0b',
    minClockGhz: 4.4,
    maxClockGhz: 4.7,
    activeCores: 8, // 4P + 4E
    marketPriceUsd: 119,
    description: 'Harvested entry silicon. Partially disabled core clusters fused off. 8 active execution threads.',
  },
  Reject: {
    grade: 'Reject',
    name: 'Reject / Scrap (Non-functional)',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-300',
    textColor: 'text-rose-600',
    bgHex: '#ef4444',
    minClockGhz: 0,
    maxClockGhz: 0,
    activeCores: 0,
    marketPriceUsd: 0,
    description: 'Fatal defect, killer particle, short-circuit, or edge-exclusion boundary breach. Non-functional silicon.',
  },
};

export function classifyDieToCpuBin(die: {
  status: DieStatus;
  severity: number;
  measuredCD: number;
  overlayError: number;
  isEdgeExclusion: boolean;
  defectCategory: DefectCategory | null;
}): {
  binGrade: CpuBinGrade;
  binClockGhz: number;
  binActiveCores: number;
  binValueUsd: number;
  binReason: string;
} {
  if (die.isEdgeExclusion || die.status === 'severe_defect' || die.severity >= 0.58) {
    return {
      binGrade: 'Reject',
      binClockGhz: 0,
      binActiveCores: 0,
      binValueUsd: 0,
      binReason: die.isEdgeExclusion
        ? 'Wafer edge exclusion boundary exclusion'
        : 'Fatal short / killer particle. Non-functional silicon.',
    };
  }

  if (die.status === 'probable_defect' || die.severity >= 0.35 || die.overlayError >= 1.8) {
    return {
      binGrade: 'i3',
      binClockGhz: 4.5,
      binActiveCores: 8,
      binValueUsd: 119,
      binReason: 'Core i3 Salvage: Defective cache/core blocks isolated. 8 active execution threads.',
    };
  }

  if (die.status === 'warning' || die.severity >= 0.18 || die.overlayError >= 1.1) {
    return {
      binGrade: 'i5',
      binClockGhz: 5.2,
      binActiveCores: 14,
      binValueUsd: 239,
      binReason: 'Core i5 Mainstream: 14 active cores, partial cache harvest, solid volume silicon.',
    };
  }

  if (die.status === 'minor_concern' || die.severity >= 0.08 || die.overlayError >= 0.6) {
    return {
      binGrade: 'i7',
      binClockGhz: 5.6,
      binActiveCores: 20,
      binValueUsd: 399,
      binReason: 'Core i7 Enthusiast: 20 active cores, high clock scaling, minor non-critical variance.',
    };
  }

  return {
    binGrade: 'i9',
    binClockGhz: 6.0,
    binActiveCores: 24,
    binValueUsd: 589,
    binReason: 'Core i9 Golden Tier: Flawless silicon, 0 defects, full 24 cores unlocked, 6.0 GHz TVB.',
  };
}

export function calculateWaferBinSummary(dies: Die[]): WaferBinSummary {
  let i9Count = 0;
  let i7Count = 0;
  let i5Count = 0;
  let i3Count = 0;
  let rejectCount = 0;

  for (const die of dies) {
    switch (die.binGrade) {
      case 'i9':
        i9Count++;
        break;
      case 'i7':
        i7Count++;
        break;
      case 'i5':
        i5Count++;
        break;
      case 'i3':
        i3Count++;
        break;
      default:
        rejectCount++;
        break;
    }
  }

  const total = dies.length || 1;
  const i9Yield = Math.round((i9Count / total) * 1000) / 10;
  const i7Yield = Math.round((i7Count / total) * 1000) / 10;
  const i5Yield = Math.round((i5Count / total) * 1000) / 10;
  const i3Yield = Math.round((i3Count / total) * 1000) / 10;
  const harvestYield = Math.round(((i9Count + i7Count + i5Count + i3Count) / total) * 1000) / 10;
  const scrapRate = Math.round((rejectCount / total) * 1000) / 10;

  const totalSiliconValueUsd =
    i9Count * CPU_BIN_CONFIGS.i9.marketPriceUsd +
    i7Count * CPU_BIN_CONFIGS.i7.marketPriceUsd +
    i5Count * CPU_BIN_CONFIGS.i5.marketPriceUsd +
    i3Count * CPU_BIN_CONFIGS.i3.marketPriceUsd;

  const averageDieValueUsd = Math.round((totalSiliconValueUsd / total) * 10) / 10;

  return {
    i9Count,
    i7Count,
    i5Count,
    i3Count,
    rejectCount,
    i9Yield,
    i7Yield,
    i5Yield,
    i3Yield,
    harvestYield,
    scrapRate,
    totalSiliconValueUsd,
    averageDieValueUsd,
  };
}

export function checkParameterStatus(
  value: number,
  config: { normalMin: number; normalMax: number; warningMin: number; warningMax: number }
): ParamStatus {
  if (value >= config.normalMin && value <= config.normalMax) {
    return 'normal';
  }
  if (value >= config.warningMin && value <= config.warningMax) {
    return 'warning';
  }
  return 'critical';
}

export function generateLayerRun(
  waferId: string,
  layerConfig: WaferLayerConfig,
  params: MainParameters,
  profile: ConstraintProfile,
  cols: number,
  rows: number,
  radius: number,
  dieSize: { x: number; y: number },
  edgeExclusion: number,
  forcedPattern?: DefectPattern,
  propagatedFromUnderlying?: Map<string, { category: DefectCategory; reason: string }>,
  layerDefectModifier?: number
): WaferLayerRun {
  const pParticle = params.particleContamination;
  const pLitho = params.lithoAlignmentError;
  const pCd = params.cdDeviation;
  const pTemp = params.temperature;
  const pRh = params.relativeHumidity;

  const cfg = profile.paramConfigs;
  const particleRatio = Math.max(0, (pParticle - cfg.particleContamination.normalMax) / (cfg.particleContamination.warningMax - cfg.particleContamination.normalMax));
  const lithoRatio = Math.max(0, (pLitho - cfg.lithoAlignmentError.normalMax) / (cfg.lithoAlignmentError.warningMax - cfg.lithoAlignmentError.normalMax));
  const cdRatio = Math.max(0, (pCd - cfg.cdDeviation.normalMax) / (cfg.cdDeviation.warningMax - cfg.cdDeviation.normalMax));
  const tempRatio = Math.max(0, Math.abs(pTemp - 21.25) / 1.5);
  const rhRatio = Math.max(0, Math.abs(pRh - 42.5) / 5.0);

  // Apply layer-specific sensitivity multipliers
  const layerParticleRatio = particleRatio * layerConfig.sensitivities.particle;
  const layerLithoRatio = lithoRatio * layerConfig.sensitivities.lithoOverlay;
  const layerCdRatio = cdRatio * layerConfig.sensitivities.cdVariation;
  const layerTempRatio = tempRatio * layerConfig.sensitivities.temperature;
  const layerRhRatio = rhRatio * layerConfig.sensitivities.relativeHumidity;

  // Layer base defect probability derived from physical layer physics
  const baseRisk =
    (layerConfig.baseDefectRate / 100) *
    (0.75 +
      layerParticleRatio * 0.65 +
      layerLithoRatio * 0.85 +
      layerCdRatio * 0.65 +
      layerTempRatio * 0.35 +
      layerRhRatio * 0.3) *
    (layerDefectModifier !== undefined ? layerDefectModifier : 1.0);

  // Choose dominant spatial pattern for this layer
  let dominantPattern: DefectPattern = forcedPattern || 'Random';
  if (!forcedPattern) {
    if (layerConfig.id === 'L3-GATE' && lithoRatio > 0.8) {
      dominantPattern = 'Edge-ring';
    } else if (layerConfig.id === 'L5-M1' && particleRatio > 0.8) {
      dominantPattern = 'Cluster';
    } else if (layerConfig.id === 'L2-FIN' && cdRatio > 0.8) {
      dominantPattern = 'Donut';
    } else if (layerConfig.id === 'L7-PAD') {
      dominantPattern = Math.random() > 0.4 ? 'Edge-ring' : 'Scratch';
    } else if (layerParticleRatio > 1.2) {
      dominantPattern = 'Cluster';
    } else if (layerLithoRatio > 1.1) {
      dominantPattern = 'Edge-ring';
    } else {
      dominantPattern = 'Random';
    }
  }

  // Scratch line equation params (if scratch pattern)
  const scratchAngle = Math.PI * 0.25 + (Math.random() - 0.5) * 0.4;
  const scratchOffset = (Math.random() - 0.5) * 60;

  // Cluster center coords
  const clusterX = (Math.random() - 0.5) * (radius * 0.85);
  const clusterY = (Math.random() - 0.5) * (radius * 0.85);
  const clusterRadius = 22 + Math.random() * 20;

  const dies: Die[] = [];
  const startX = -((cols - 1) * dieSize.x) / 2;
  const startY = -((rows - 1) * dieSize.y) / 2;

  let goodCount = 0;
  let minorCount = 0;
  let warningCount = 0;
  let defectiveCount = 0;
  let killerCount = 0;
  let propagatedCount = 0;
  const categoryCounts: Record<string, number> = {};

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const posX = startX + c * dieSize.x;
      const posY = startY + r * dieSize.y;
      const dist = Math.sqrt(posX * posX + posY * posY);

      const isValid = dist <= radius - 1.5;
      if (!isValid) continue;

      const dieKey = `R${r}-C${c}`;
      const isEdgeExclusion = dist >= radius - edgeExclusion;

      let spatialMultiplier = 1.0;
      switch (dominantPattern) {
        case 'Edge-ring':
          if (dist > radius * 0.72) {
            const edgeFactor = (dist - radius * 0.72) / (radius * 0.28);
            spatialMultiplier += edgeFactor * 4.2;
          }
          break;
        case 'Center':
          if (dist < radius * 0.35) {
            spatialMultiplier += (1 - dist / (radius * 0.35)) * 3.5;
          }
          break;
        case 'Donut': {
          const donutMid = radius * 0.55;
          const distFromDonut = Math.abs(dist - donutMid);
          if (distFromDonut < 30) {
            spatialMultiplier += (1 - distFromDonut / 30) * 3.2;
          }
          break;
        }
        case 'Cluster': {
          const dToCluster = Math.sqrt((posX - clusterX) ** 2 + (posY - clusterY) ** 2);
          if (dToCluster < clusterRadius) {
            spatialMultiplier += (1 - dToCluster / clusterRadius) * 5.0;
          }
          break;
        }
        case 'Scratch': {
          const distToLine = Math.abs(
            Math.cos(scratchAngle) * posX + Math.sin(scratchAngle) * posY - scratchOffset
          );
          if (distToLine < 12 && dist < radius * 0.9) {
            spatialMultiplier += (1 - distToLine / 12) * 5.5;
          }
          break;
        }
        case 'Random':
        default:
          spatialMultiplier += (Math.random() - 0.5) * 0.4;
          break;
      }

      // Add noise
      const noise = (Math.random() - 0.5) * profile.randomNoiseLevel * 1.8;
      let dieRisk = Math.min(0.99, Math.max(0.01, baseRisk * spatialMultiplier + noise));

      if (isEdgeExclusion) {
        dieRisk = Math.max(dieRisk, 0.72);
      }

      let defectCategory: DefectCategory | null = null;
      let defectReason = `${layerConfig.shortCode}: Die within nominal tolerances.`;
      let defectNature: DefectNature = 'predicted';
      let propagatedFromLayer: string | undefined = undefined;

      // Check cross-layer propagated defect
      const propagatedDefect = propagatedFromUnderlying?.get(dieKey);
      if (propagatedDefect && Math.random() < 0.78) {
        dieRisk = Math.max(dieRisk, 0.82);
        propagatedCount++;
        propagatedFromLayer = propagatedDefect.reason.split(' ')[0] || 'Underlying Layer';
        defectCategory = propagatedDefect.category;
        defectReason = `Cross-layer yield loss: Propagated fatal defect originating from underlying ${propagatedDefect.reason}.`;
      }

      let status: DieStatus = 'good';
      if (dieRisk > 0.58) {
        status = 'severe_defect';
        defectiveCount++;
        killerCount++;
      } else if (dieRisk > 0.36) {
        status = 'probable_defect';
        defectiveCount++;
      } else if (dieRisk > 0.20) {
        status = 'warning';
        warningCount++;
      } else if (dieRisk > 0.10) {
        status = 'minor_concern';
        minorCount++;
      } else {
        status = 'good';
        goodCount++;
      }

      if (status !== 'good' && !defectCategory) {
        if (isEdgeExclusion) {
          defectCategory = 'Edge damage';
          defectReason = `${layerConfig.shortCode}: Die intersects wafer edge exclusion boundary (<${edgeExclusion}mm from bevel).`;
        } else if (dominantPattern === 'Scratch' && spatialMultiplier > 2.2) {
          defectCategory = 'Scratch';
          defectReason = `${layerConfig.shortCode}: Mechanical handling scratch across layer surface.`;
        } else if (dominantPattern === 'Cluster' && spatialMultiplier > 2.2) {
          defectCategory = 'Cluster defect';
          defectReason = `${layerConfig.shortCode}: High-density micro-defect cluster observed in active array.`;
        } else if (layerLithoRatio > 1.2 && layerConfig.sensitivities.lithoOverlay >= 1.8) {
          defectCategory = 'Lithography misalignment';
          defectReason = `${layerConfig.shortCode}: Scanner overlay drift exceeds layer budget (tolerance: ${layerConfig.overlayToleranceNm}nm).`;
        } else if (layerParticleRatio > 1.1 && layerConfig.sensitivities.particle >= 2.0) {
          defectCategory = 'Particle contamination';
          defectReason = `${layerConfig.shortCode}: Particle deposition detected on critical pattern (tolerance: ${cfg.particleContamination.normalMax} part/cm²).`;
        } else if (layerCdRatio > 1.1 && layerConfig.sensitivities.cdVariation >= 2.0) {
          defectCategory = 'Critical-dimension variation';
          defectReason = `${layerConfig.shortCode}: Etch critical dimension bias violates node CD target (${layerConfig.criticalFeatureNm}nm).`;
        } else if (layerTempRatio > 1.0 || layerRhRatio > 1.0) {
          defectCategory = 'Environmental excursion';
          defectReason = `${layerConfig.shortCode}: Ambient cleanroom thermal or moisture excursion impacting process chamber.`;
        } else {
          defectCategory = Math.random() > 0.5 ? 'Random defect' : 'Pattern distortion';
          defectReason = `${layerConfig.shortCode}: Localized pattern distortion or dielectric micro-void.`;
        }

        categoryCounts[defectCategory] = (categoryCounts[defectCategory] || 0) + 1;
      }

      // Height offset for 3D visualization
      let elevation = 0.5;
      if (status === 'minor_concern') elevation = 1.0;
      else if (status === 'warning') elevation = 2.0;
      else if (status === 'probable_defect') elevation = 3.6;
      else if (status === 'severe_defect') elevation = 5.2;

      // Layer measured overlay error & CD
      const dieOverlay = Math.round((pLitho * (0.6 + layerConfig.sensitivities.lithoOverlay * 0.3) + (Math.random() - 0.5) * 0.4) * 10) / 10;
      const dieCD = Math.round((layerConfig.criticalFeatureNm + pCd * layerConfig.sensitivities.cdVariation * 0.4 + (Math.random() - 0.5) * 0.3) * 10) / 10;

      dies.push({
        id: `${waferId}-${layerConfig.id}-D${r.toString().padStart(2, '0')}-${c.toString().padStart(2, '0')}`,
        col: c,
        row: r,
        posXmm: Math.round(posX * 10) / 10,
        posYmm: Math.round(posY * 10) / 10,
        distFromCenterMm: Math.round(dist * 10) / 10,
        isEdgeExclusion,
        isValid: true,
        status,
        defectCategory,
        defectNature,
        defectReason,
        severity: Math.round(dieRisk * 100) / 100,
        elevation,
        measuredCD: dieCD,
        overlayError: dieOverlay,
        layerId: layerConfig.id,
        propagatedFromLayer,
      });
    }
  }

  const totalDies = dies.length;
  const passCount = goodCount + minorCount;
  const dieYield = totalDies > 0 ? Math.round((passCount / totalDies) * 1000) / 10 : 0;
  const defectRate = totalDies > 0 ? Math.round((defectiveCount / totalDies) * 1000) / 10 : 0;

  // Find dominant defect category for this layer
  let dominantDefectCategory: DefectCategory = layerConfig.dominantDefectTypes[0] || 'Random defect';
  let maxCount = -1;
  for (const [cat, cnt] of Object.entries(categoryCounts)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      dominantDefectCategory = cat as DefectCategory;
    }
  }

  const overlayErrorAverageNm = Math.round((dies.reduce((sum, d) => sum + d.overlayError, 0) / totalDies) * 10) / 10;
  const cdDeviationAverageNm = Math.round((dies.reduce((sum, d) => sum + Math.abs(d.measuredCD - layerConfig.criticalFeatureNm), 0) / totalDies) * 100) / 100;
  const layerHealthScore = Math.max(10, Math.min(100, Math.round(dieYield * 0.7 + (100 - defectRate * 2.5) * 0.3)));

  return {
    layerConfig,
    defectRate,
    dieYield,
    goodDies: goodCount,
    defectiveDies: defectiveCount,
    minorConcernDies: minorCount,
    warningDies: warningCount,
    dominantDefectCategory,
    dominantPattern,
    dies,
    overlayErrorAverageNm,
    cdDeviationAverageNm,
    killerDefectCount: killerCount,
    layerHealthScore,
    propagatedDefectCount: propagatedCount,
  };
}

export function generateSingleWafer(
  waferId: string,
  batchId: string,
  params: MainParameters,
  profile: ConstraintProfile,
  isTestWafer: boolean = false,
  forcedPattern?: DefectPattern,
  isLayerDecreasing: boolean = false,
  waferNotes?: string
): Wafer {
  const diameter = profile.waferDiameterMm;
  const radius = diameter / 2;
  const dieSize = profile.dieSizeMm;
  const edgeExclusion = profile.edgeExclusionMm;

  const cols = Math.floor((diameter - 10) / dieSize.x);
  const rows = Math.floor((diameter - 10) / dieSize.y);

  // Generate all 7 process layers sequentially with cross-layer propagation
  const layerRuns: WaferLayerRun[] = [];
  const propagatedDefects = new Map<string, { category: DefectCategory; reason: string }>();

  // Sort layers by stackOrder
  const sortedLayers = [...PROCESS_LAYER_DEFINITIONS].sort((a, b) => a.stackOrder - b.stackOrder);

  for (const layerConfig of sortedLayers) {
    let layerModifier = 1.0;
    if (isLayerDecreasing) {
      // For Phase 2: as moving up through the stack (L1 -> L7), defect rate strictly decreases!
      const step = (layerConfig.stackOrder - 1) / 6; // 0.0 at L1 to 1.0 at L7
      layerModifier = 2.4 - step * 2.15; // 2.40 down to 0.25
    }

    const layerRun = generateLayerRun(
      waferId,
      layerConfig,
      params,
      profile,
      cols,
      rows,
      radius,
      dieSize,
      edgeExclusion,
      forcedPattern,
      propagatedDefects,
      layerModifier
    );

    // If layer has severe defects (especially Gate L3), register them for propagation into upper layers (Contact, M1)
    if (layerConfig.id === 'L3-GATE' || layerConfig.id === 'L2-FIN') {
      layerRun.dies.forEach((die) => {
        if (die.status === 'severe_defect' && die.defectCategory) {
          const key = `R${die.row}-C${die.col}`;
          propagatedDefects.set(key, {
            category: die.defectCategory,
            reason: `${layerConfig.shortCode} (Fatal ${die.defectCategory})`,
          });
        }
      });
    }

    layerRuns.push(layerRun);
  }

  // Choose representative active layer: Gate (L3) or Metal 1 (L5)
  const defaultActiveLayer = layerRuns.find((l) => l.layerConfig.id === 'L3-GATE') || layerRuns[0];

  // Composite dies: a die is defective if it failed in ANY critical layer of the stack!
  const compositeDies: Die[] = [];
  const totalDiesInGrid = defaultActiveLayer.dies.length;

  let goodCount = 0;
  let minorCount = 0;
  let warningCount = 0;
  let defectiveCount = 0;
  const compositeCategoryCounts: Record<string, number> = {};

  for (let i = 0; i < totalDiesInGrid; i++) {
    const baseDie = defaultActiveLayer.dies[i];
    // Find worst status across all layers for this die location
    const allLayerDiesAtPos = layerRuns.map((lr) => lr.dies[i]);

    let worstStatus: DieStatus = 'good';
    let worstDefectCat: DefectCategory | null = null;
    let worstReason = baseDie.defectReason;
    let worstSeverity = 0;
    let highestElevation = 0;
    let maxOverlay = 0;
    let maxCDDev = 0;

    for (const lDie of allLayerDiesAtPos) {
      if (lDie.severity > worstSeverity) {
        worstSeverity = lDie.severity;
      }
      if (lDie.elevation > highestElevation) {
        highestElevation = lDie.elevation;
      }
      if (lDie.overlayError > maxOverlay) {
        maxOverlay = lDie.overlayError;
      }
      const cdDev = Math.abs(lDie.measuredCD - 10);
      if (cdDev > maxCDDev) {
        maxCDDev = cdDev;
      }

      if (lDie.status === 'severe_defect') {
        worstStatus = 'severe_defect';
        worstDefectCat = lDie.defectCategory;
        worstReason = lDie.defectReason;
      } else if (lDie.status === 'probable_defect' && worstStatus !== 'severe_defect') {
        worstStatus = 'probable_defect';
        worstDefectCat = lDie.defectCategory;
        worstReason = lDie.defectReason;
      } else if (lDie.status === 'warning' && worstStatus !== 'severe_defect' && worstStatus !== 'probable_defect') {
        worstStatus = 'warning';
        worstDefectCat = lDie.defectCategory;
        worstReason = lDie.defectReason;
      } else if (lDie.status === 'minor_concern' && worstStatus === 'good') {
        worstStatus = 'minor_concern';
        worstDefectCat = lDie.defectCategory;
        worstReason = lDie.defectReason;
      }
    }

    if (worstStatus === 'severe_defect' || worstStatus === 'probable_defect') {
      defectiveCount++;
    } else if (worstStatus === 'warning') {
      warningCount++;
    } else if (worstStatus === 'minor_concern') {
      minorCount++;
    } else {
      goodCount++;
    }

    if (worstDefectCat) {
      compositeCategoryCounts[worstDefectCat] = (compositeCategoryCounts[worstDefectCat] || 0) + 1;
    }

    const binInfo = classifyDieToCpuBin({
      status: worstStatus,
      severity: worstSeverity,
      measuredCD: baseDie.measuredCD,
      overlayError: maxOverlay,
      isEdgeExclusion: baseDie.isEdgeExclusion,
      defectCategory: worstDefectCat,
    });

    compositeDies.push({
      ...baseDie,
      id: `${waferId}-D${baseDie.row.toString().padStart(2, '0')}-${baseDie.col.toString().padStart(2, '0')}`,
      status: worstStatus,
      defectCategory: worstDefectCat,
      defectReason: worstReason,
      severity: worstSeverity,
      elevation: highestElevation,
      overlayError: maxOverlay,
      measuredCD: baseDie.measuredCD,
      binGrade: binInfo.binGrade,
      binClockGhz: binInfo.binClockGhz,
      binActiveCores: binInfo.binActiveCores,
      binValueUsd: binInfo.binValueUsd,
      binReason: binInfo.binReason,
    });
  }

  const totalDies = compositeDies.length;
  const passCount = goodCount + minorCount;
  const dieYield = totalDies > 0 ? Math.round((passCount / totalDies) * 1000) / 10 : 0;
  const defectRate = totalDies > 0 ? Math.round((defectiveCount / totalDies) * 1000) / 10 : 0;

  // Find dominant defect category across the composite stack
  let dominantDefectCategory: DefectCategory = 'Random defect';
  let maxCatCount = -1;
  for (const [cat, cnt] of Object.entries(compositeCategoryCounts)) {
    if (cnt > maxCatCount) {
      maxCatCount = cnt;
      dominantDefectCategory = cat as DefectCategory;
    }
  }

  const dominantPattern = defaultActiveLayer.dominantPattern;

  // Parameter contributions
  const cfg = profile.paramConfigs;
  const particleRatio = Math.max(0, (params.particleContamination - cfg.particleContamination.normalMax) / (cfg.particleContamination.warningMax - cfg.particleContamination.normalMax));
  const lithoRatio = Math.max(0, (params.lithoAlignmentError - cfg.lithoAlignmentError.normalMax) / (cfg.lithoAlignmentError.warningMax - cfg.lithoAlignmentError.normalMax));
  const cdRatio = Math.max(0, (params.cdDeviation - cfg.cdDeviation.normalMax) / (cfg.cdDeviation.warningMax - cfg.cdDeviation.normalMax));
  const tempRatio = Math.max(0, Math.abs(params.temperature - 21.25) / 1.5);
  const rhRatio = Math.max(0, Math.abs(params.relativeHumidity - 42.5) / 5.0);

  const contributions = [
    { name: 'Particle Contamination', score: particleRatio * cfg.particleContamination.weight },
    { name: 'Lithography Alignment Error', score: lithoRatio * cfg.lithoAlignmentError.weight },
    { name: 'Critical Dimension Deviation', score: cdRatio * cfg.cdDeviation.weight },
    { name: 'Cleanroom Temperature', score: tempRatio * cfg.temperature.weight },
    { name: 'Relative Humidity', score: rhRatio * cfg.relativeHumidity.weight },
  ];
  contributions.sort((a, b) => b.score - a.score);
  const mostInfluentialParameter = contributions[0].score > 0.05 ? contributions[0].name : 'Nominal Process Baseline';

  const confidence = Math.min(
    95,
    Math.max(65, Math.round(88 - (Math.abs(tempRatio) + Math.abs(rhRatio)) * 3 + (isTestWafer ? 4 : 0)))
  );

  let qualityClass: QualityClass = 'Acceptable';
  const classificationReasons: string[] = [];

  const particleStatus = checkParameterStatus(params.particleContamination, cfg.particleContamination);
  const lithoStatus = checkParameterStatus(params.lithoAlignmentError, cfg.lithoAlignmentError);

  if (defectRate > 25 || dieYield < 65 || particleStatus === 'critical' || lithoStatus === 'critical') {
    qualityClass = 'Reject for Review';
    classificationReasons.push(`Cumulative multi-layer defect rate (${defectRate}%) exceeds critical rejection ceiling.`);
    if (lithoStatus === 'critical') {
      classificationReasons.push(`Lithography alignment error (${params.lithoAlignmentError} nm) in critical alarm state at Gate HKMG.`);
    }
    if (particleStatus === 'critical') {
      classificationReasons.push(`Particle contamination level (${params.particleContamination} part/cm²) breached safe envelope.`);
    }
  } else if (defectRate > 15 || dieYield < 78 || lithoStatus === 'warning' || particleStatus === 'warning') {
    qualityClass = 'At Risk';
    classificationReasons.push(`Multi-layer defect rate (${defectRate}%) is above warning threshold.`);
    classificationReasons.push(`Dominant pattern detected: ${dominantPattern} defects.`);
    classificationReasons.push(`${mostInfluentialParameter} is the primary driver of layer yield loss.`);
  } else if (defectRate > 8 || dieYield < 88 || warningCount > totalDies * 0.15) {
    qualityClass = 'Watch';
    classificationReasons.push(`Yield (${dieYield}%) is marginally below the 88% target benchmark.`);
  } else if (dieYield >= 93 && defectRate <= 4.5 && particleStatus === 'normal' && lithoStatus === 'normal') {
    qualityClass = 'Excellent';
    classificationReasons.push(`High finished die yield of ${dieYield}% across all 7 layers.`);
    classificationReasons.push('All core process parameters within optimal nominal bands.');
  } else {
    qualityClass = 'Acceptable';
    classificationReasons.push(`Nominal yield (${dieYield}%) and defect rate (${defectRate}%) within production standard.`);
  }

  const binSummary = calculateWaferBinSummary(compositeDies);

  return {
    id: waferId,
    batchId,
    waferDiameterMm: diameter,
    gridRows: rows,
    gridCols: cols,
    dieSizeMm: dieSize,
    edgeExclusionMm: edgeExclusion,
    processLayer: defaultActiveLayer.layerConfig.name,
    activeLayerId: defaultActiveLayer.layerConfig.id,
    layers: layerRuns,
    parameters: { ...params },
    totalDies,
    goodDies: goodCount,
    minorConcernDies: minorCount,
    warningDies: warningCount,
    defectiveDies: defectiveCount,
    defectRate,
    dieYield,
    qualityClass,
    confidence,
    dominantDefectPattern: dominantPattern,
    dominantDefectCategory,
    mostInfluentialParameter,
    classificationReasons,
    dies: compositeDies,
    isTestWafer,
    binSummary,
    notes: waferNotes,
    createdAt: new Date().toISOString(),
  };
}

export function generateBatchAnalysis(
  testWaferParams: MainParameters,
  batchSize: number = 25,
  profile: ConstraintProfile,
  customBatchId?: string,
  customWaferId?: string
): { testWafer: Wafer; batch: Batch } {
  const batchId = customBatchId || `LOT-${new Date().getFullYear()}-FOUP-${Math.floor(1000 + Math.random() * 9000)}`;
  const total = Math.max(10, batchSize);
  const wafers: Wafer[] = [];

  // Progression strictly adhering to user intent: High Yield -> Low Yield -> High Yield
  // Phase 1 (First ~36% of lot, e.g. W01-W09): High Yield (93% - 97%)
  // Phase 2 (Middle ~36% of lot, e.g. W10-W18): Low Yield (58% - 72%) with layer defect decreasing (L1 Substrate -> L7 Pad)
  // Phase 3 (Final ~28% of lot, e.g. W19-W25): High Yield Recovery (94% - 98%)
  const p1End = Math.max(3, Math.round(total * 0.36)); // e.g. 9 for 25, 36 for 100
  const p2End = Math.max(p1End + 3, Math.round(total * 0.72)); // e.g. 18 for 25, 72 for 100

  for (let i = 1; i <= total; i++) {
    const isFirst = i === 1;
    const wfrId = isFirst && customWaferId ? customWaferId : `${batchId}-W${i.toString().padStart(2, '0')}`;

    let waferParams: MainParameters;
    let isLayerDecreasing = false;
    let waferNotes = '';

    if (i <= p1End) {
      // Phase 1: High Yield Production (Peak Spec: ~93% to 97% die yield)
      const jitter = (Math.random() - 0.5);
      waferParams = {
        particleContamination: Math.max(0.02, Math.round((0.05 + jitter * 0.02) * 100) / 100),
        lithoAlignmentError: Math.max(0.15, Math.round((0.26 + jitter * 0.06) * 100) / 100),
        cdDeviation: Math.max(0.06, Math.round((0.12 + jitter * 0.03) * 100) / 100),
        temperature: Math.round((21.0 + jitter * 0.05) * 10) / 10,
        relativeHumidity: Math.round((42.0 + jitter * 0.3) * 10) / 10,
      };
      isLayerDecreasing = false;
      waferNotes = `Phase 1 (Wafer #${i}): High-yield nominal production. Chamber clean, optical alignment locked within 0.3µm spec.`;
    } else if (i <= p2End) {
      // Phase 2: Low Yield Excursion (~58% to 72% die yield)
      // "more defective wafers (5-10 wafers as moving in the layer defect decreases)"
      const jitter = (Math.random() - 0.5);
      waferParams = {
        particleContamination: Math.round((0.82 + jitter * 0.12) * 100) / 100,
        lithoAlignmentError: Math.round((2.05 + jitter * 0.20) * 100) / 100,
        cdDeviation: Math.round((1.10 + jitter * 0.14) * 100) / 100,
        temperature: Math.round((22.4 + jitter * 0.15) * 10) / 10,
        relativeHumidity: Math.round((46.8 + jitter * 0.6) * 10) / 10,
      };
      // CRITICAL: layer defect decreases as moving from bottom substrate L1 up to pad L7!
      isLayerDecreasing = true;
      waferNotes = `Phase 2 (Wafer #${i}): Low-yield excursion phase with heavy defects. Defect rate strictly decreases as moving up through layers (L1 Substrate -> L7 Pad).`;
    } else {
      // Phase 3: High Yield Recovery (~94% to 98% die yield)
      // Chamber purged, stepper recalibrated, yields rebound to peak benchmark!
      const jitter = (Math.random() - 0.5);
      waferParams = {
        particleContamination: Math.max(0.02, Math.round((0.04 + jitter * 0.02) * 100) / 100),
        lithoAlignmentError: Math.max(0.14, Math.round((0.22 + jitter * 0.05) * 100) / 100),
        cdDeviation: Math.max(0.05, Math.round((0.10 + jitter * 0.03) * 100) / 100),
        temperature: Math.round((21.0 + jitter * 0.05) * 10) / 10,
        relativeHumidity: Math.round((41.9 + jitter * 0.2) * 10) / 10,
      };
      isLayerDecreasing = false;
      waferNotes = `Phase 3 (Wafer #${i}): High-yield recovery phase. Thermal stabilization & laser stage recalibration executed; lot yields surge back to peak 94-98% benchmark.`;
    }

    const wafer = generateSingleWafer(
      wfrId,
      batchId,
      waferParams,
      profile,
      isFirst,
      undefined,
      isLayerDecreasing,
      waferNotes
    );
    wafers.push(wafer);
  }

  const testWafer = wafers[0];

  // Calculate batch aggregates
  const avgYield = Math.round((wafers.reduce((acc, w) => acc + w.dieYield, 0) / wafers.length) * 10) / 10;
  const avgDefectRate = Math.round((wafers.reduce((acc, w) => acc + w.defectRate, 0) / wafers.length) * 10) / 10;
  const criticalWafersCount = wafers.filter((w) => w.qualityClass === 'Reject for Review' || w.qualityClass === 'At Risk').length;

  // Most common defect
  const catTotals: Record<string, number> = {};
  wafers.forEach((w) => {
    catTotals[w.dominantDefectCategory] = (catTotals[w.dominantDefectCategory] || 0) + 1;
  });
  let mostCommonDefect = testWafer.dominantDefectCategory;
  let maxCount = -1;
  for (const [cat, count] of Object.entries(catTotals)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonDefect = cat as DefectCategory;
    }
  }

  // Aggregate Batch Binning across all dies of all wafers in the lot
  const allBatchDies = wafers.flatMap((w) => w.dies);
  const batchBinSummary = calculateWaferBinSummary(allBatchDies);

  const batch: Batch = {
    id: batchId,
    name: `${batchId} (${total} Wafers - ${profile.processNode})`,
    testWaferId: testWafer.id,
    batchSize: total,
    wafers,
    avgYield,
    avgDefectRate,
    criticalWafersCount,
    mostCommonDefect,
    mostInfluentialParam: testWafer.mostInfluentialParameter,
    createdAt: new Date().toISOString(),
    batchBinSummary,
  };

  return { testWafer, batch };
}

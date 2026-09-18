import { Wafer, WaferLayerRun, WaferLayerConfig, Die, DefectCategory, DefectPattern, DieStatus } from '../types';

// Color palettes for different material families
const LAYER_PALETTES = {
  substrate: '#64748b', // Slate silicon
  well: '#475569',
  isolation: '#38bdf8', // Cyan STI oxide
  gate: '#3b82f6', // Cobalt polysilicon/high-k metal gate
  contact: '#a855f7', // Purple tungsten contact
  metalLow: '#f97316', // Orange Copper M1-M3
  viaLow: '#ef4444', // Red Via 1-2
  metalMid: '#eab308', // Amber Copper M4-M8
  viaMid: '#f59e0b',
  nandTier: '#06b6d4', // Cyan 3D NAND memory tier
  nandWL: '#6366f1', // Indigo Wordline
  metalHigh: '#10b981', // Emerald thick top metal
  passivation: '#14b8a6', // Teal passivation SiN
  pad: '#8b5cf6', // Violet RDL & micro-bumps
};

// Export presets for UI selectors
export const LAYER_PRESET_COUNTS = [10, 24, 64, 128, 256, 500, 1000] as const;

/**
 * Generates a realistic 10 to 1000-layer semiconductor stack run for 3D multi-layer testing
 */
export function generateLayerBatchStack(baseWafer: Wafer, layerCount: number): WaferLayerRun[] {
  const count = Math.min(1000, Math.max(10, layerCount));
  const layers: WaferLayerRun[] = [];

  // Seeded random helper for reproducible realistic stack profiles
  let seed = 42;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < count; i++) {
    const fraction = i / (count - 1); // 0 at bottom, 1 at top
    const layerNum = i + 1;

    let category: 'FEOL' | 'MOL' | 'BEOL' = 'BEOL';
    let subCategory = 'Interconnect';
    let baseColor = LAYER_PALETTES.metalLow;
    let name = '';
    let shortCode = `L${layerNum}`;
    let thicknessNm = 45;
    let metallic = 0.5;
    let roughness = 0.3;

    if (count <= 16) {
      // 10-16 Layer standard logic stack
      if (i === 0) {
        category = 'FEOL';
        name = 'Silicon Substrate & Well';
        shortCode = 'L1-SUB';
        baseColor = LAYER_PALETTES.substrate;
        thicknessNm = 775000; // bulk wafer
        metallic = 0.2;
      } else if (i === 1) {
        category = 'FEOL';
        name = 'Shallow Trench Isolation (STI)';
        shortCode = 'L2-STI';
        baseColor = LAYER_PALETTES.isolation;
        thicknessNm = 120;
      } else if (i === 2) {
        category = 'FEOL';
        name = 'FinFET / GAA Nanosheet Channel';
        shortCode = 'L3-FIN';
        baseColor = '#3b82f6';
        thicknessNm = 65;
      } else if (i === 3) {
        category = 'FEOL';
        name = 'High-K Metal Gate (HKMG)';
        shortCode = 'L4-GATE';
        baseColor = '#2563eb';
        thicknessNm = 45;
        metallic = 0.7;
      } else if (i === 4) {
        category = 'MOL';
        name = 'Source / Drain Epitaxy Contact';
        shortCode = 'L5-EPI';
        baseColor = '#8b5cf6';
        thicknessNm = 55;
      } else if (i === 5) {
        category = 'MOL';
        name = 'Middle Contact Tungsten (M0)';
        shortCode = 'L6-M0';
        baseColor = LAYER_PALETTES.contact;
        thicknessNm = 40;
        metallic = 0.8;
      } else if (i < count - 2) {
        category = 'BEOL';
        const mIdx = i - 5;
        name = `Metal Interconnect M${mIdx} (Cu)`;
        shortCode = `L${layerNum}-M${mIdx}`;
        baseColor = mIdx % 2 === 0 ? LAYER_PALETTES.metalLow : LAYER_PALETTES.metalMid;
        thicknessNm = 35 + mIdx * 12;
        metallic = 0.85;
      } else if (i === count - 2) {
        category = 'BEOL';
        name = 'Top Thick Power Mesh (M_Top)';
        shortCode = `L${layerNum}-MTOP`;
        baseColor = LAYER_PALETTES.metalHigh;
        thicknessNm = 120;
        metallic = 0.9;
      } else {
        category = 'BEOL';
        name = 'Passivation & Solder Bump Redistribution';
        shortCode = `L${layerNum}-PAD`;
        baseColor = LAYER_PALETTES.pad;
        thicknessNm = 250;
      }
    } else {
      // 17 to 1000 layers (Advanced 3D-NAND / Monolithic 3D Multi-Deck)
      if (i === 0) {
        category = 'FEOL';
        name = 'Substrate & Peripheral CMOS Under Array (CUA)';
        shortCode = 'L001-SUB';
        baseColor = LAYER_PALETTES.substrate;
        thicknessNm = 350;
      } else if (i === 1) {
        category = 'FEOL';
        name = 'Periphery Circuit Interconnect Routing';
        shortCode = 'L002-PERI';
        baseColor = LAYER_PALETTES.isolation;
        thicknessNm = 80;
      } else if (i < count - 4) {
        // High density vertical memory/logic decks
        const deckTier = Math.floor((i - 2) / 32) + 1;
        const subIndex = ((i - 2) % 32) + 1;
        category = 'BEOL';
        const isEtchVias = subIndex % 4 === 0;
        const isWordline = subIndex % 2 === 0;

        if (isEtchVias) {
          name = `Tier ${deckTier} High-Aspect HARC Channel Etch #${subIndex}`;
          shortCode = `L${String(layerNum).padStart(3, '0')}-HARC`;
          baseColor = '#ef4444'; // Red alert via
          thicknessNm = 110;
        } else if (isWordline) {
          name = `Tier ${deckTier} Wordline Poly/Tungsten Stack #${subIndex}`;
          shortCode = `L${String(layerNum).padStart(3, '0')}-WL`;
          baseColor = (deckTier % 2 === 1) ? '#6366f1' : '#3b82f6';
          thicknessNm = 32;
          metallic = 0.75;
        } else {
          name = `Tier ${deckTier} Oxide-Nitride Dielectric Bilayer #${subIndex}`;
          shortCode = `L${String(layerNum).padStart(3, '0')}-ON`;
          baseColor = (deckTier % 2 === 1) ? '#06b6d4' : '#0ea5e9';
          thicknessNm = 28;
          roughness = 0.4;
        }
      } else if (i === count - 4) {
        category = 'BEOL';
        name = 'Through-Silicon Via (TSV) Contact Interface';
        shortCode = `L${String(layerNum).padStart(3, '0')}-TSV`;
        baseColor = '#ec4899';
        thicknessNm = 450;
        metallic = 0.9;
      } else if (i === count - 3) {
        category = 'BEOL';
        name = 'Redistribution Metal Layer 1 (RDL-1)';
        shortCode = `L${String(layerNum).padStart(3, '0')}-RDL1`;
        baseColor = '#f59e0b';
        thicknessNm = 180;
        metallic = 0.85;
      } else if (i === count - 2) {
        category = 'BEOL';
        name = 'Redistribution Metal Layer 2 (RDL-2)';
        shortCode = `L${String(layerNum).padStart(3, '0')}-RDL2`;
        baseColor = '#10b981';
        thicknessNm = 220;
        metallic = 0.85;
      } else {
        category = 'BEOL';
        name = 'Micro-Bump & C4 Solder Ball Terminal Array';
        shortCode = `L${String(layerNum).padStart(3, '0')}-BUMP`;
        baseColor = '#8b5cf6';
        thicknessNm = 600;
        metallic = 0.95;
      }
    }

    // Realistic physics defect rate formula:
    // Middle tiers and HARC etching have higher defect rate due to aspect ratio
    const depthCurve = Math.sin(fraction * Math.PI); // Highest in mid-stack
    const periodicNoise = (Math.sin(i * 0.4) + Math.cos(i * 0.17)) * 0.8;
    const isCriticalTier = (i % 32 === 0) || (i % 64 === 0);
    const criticalTierPenalty = isCriticalTier ? 2.5 : 0;

    const baseRate = 2.4 + (depthCurve * 4.2) + periodicNoise + criticalTierPenalty;
    const defectRate = Math.min(24.5, Math.max(0.6, Math.round(baseRate * 10) / 10));
    const dieYield = Math.round((100 - defectRate) * 10) / 10;

    const overlayErrorAverageNm = Math.round((0.8 + fraction * 1.8 + random() * 0.8) * 10) / 10;
    const cdDeviationAverageNm = Math.round((0.6 + depthCurve * 1.5 + random() * 0.6) * 10) / 10;
    const killerDefectCount = Math.max(1, Math.round((defectRate * 18) / 10));
    const propagatedDefectCount = Math.max(0, Math.round((defectRate * 6) / 10));

    // Construct layer config
    const layerConfig: WaferLayerConfig = {
      id: shortCode,
      name,
      shortCode,
      category,
      stackOrder: layerNum,
      thicknessNm,
      criticalFeatureNm: Math.max(3, Math.round(5 + fraction * 18)),
      overlayToleranceNm: Math.max(1.5, Math.round(2 + fraction * 3.5)),
      baseDefectRate: Math.round(baseRate * 10) / 10,
      sensitivities: {
        particle: 1.2,
        lithoOverlay: 1.5,
        cdVariation: 1.1,
        temperature: 0.8,
        relativeHumidity: 0.5,
      },
      dominantDefectTypes: ['Particle contamination', 'Lithography misalignment', 'Critical-dimension variation'],
      cleanroomBay: `Bay ${((i % 8) + 1)} - Cleanroom ISO 1`,
      toolType: category === 'FEOL' ? 'EUV Lithography Scanner' : category === 'MOL' ? 'Atomic Layer Deposition' : 'Dual-Damascene CMP',
      colorHex: baseColor,
      metallic,
      roughness,
      opacity: 0.85,
      description: `${category} stage • Metrology spec: Overlay < ${overlayErrorAverageNm + 0.5}nm, CD Dev < ${cdDeviationAverageNm + 0.5}nm`,
    };

    // Synthesize sample dies (reusing base wafer grid coordinates with layer-specific defect status)
    const dies: Die[] = (baseWafer.dies || []).map((baseDie) => {
      let status: DieStatus = 'good';
      let defectCategory: DefectCategory | null = null;
      let severity = 0.1;
      let isPropagated = false;

      // Deterministic defect assignment per layer and die coordinates
      const dieCoordHash = Math.abs(Math.sin(baseDie.col * 12.9898 + baseDie.row * 78.233 + i * 43.123));
      const defectThreshold = defectRate / 100;

      if (dieCoordHash < defectThreshold * 0.4) {
        status = 'severe_defect';
        defectCategory = 'Particle contamination';
        severity = 0.95;
        if (i > 1 && dieCoordHash < defectThreshold * 0.2) {
          isPropagated = true;
        }
      } else if (dieCoordHash < defectThreshold * 0.7) {
        status = 'probable_defect';
        defectCategory = 'Lithography misalignment';
        severity = 0.7;
      } else if (dieCoordHash < defectThreshold) {
        status = 'warning';
        defectCategory = 'Critical-dimension variation';
        severity = 0.45;
      } else if (dieCoordHash < defectThreshold * 1.25) {
        status = 'minor_concern';
        severity = 0.25;
      }

      return {
        ...baseDie,
        id: `${shortCode}-D${baseDie.row}_${baseDie.col}`,
        status,
        defectCategory,
        severity,
        layerId: shortCode,
        propagatedFromLayer: isPropagated ? `L${Math.max(1, layerNum - 1)}` : undefined,
      };
    });

    const goodDies = dies.filter((d) => d.status === 'good').length;
    const defectiveDies = dies.filter((d) => d.status === 'severe_defect' || d.status === 'probable_defect').length;
    const minorConcernDies = dies.filter((d) => d.status === 'minor_concern').length;
    const warningDies = dies.filter((d) => d.status === 'warning').length;

    layers.push({
      layerConfig,
      defectRate,
      dieYield,
      goodDies,
      defectiveDies,
      minorConcernDies,
      warningDies,
      dominantDefectCategory: 'Lithography misalignment',
      dominantPattern: i % 4 === 0 ? 'Edge-ring' : i % 5 === 0 ? 'Cluster' : 'Random',
      dies,
      overlayErrorAverageNm,
      cdDeviationAverageNm,
      killerDefectCount,
      layerHealthScore: Math.round(100 - defectRate * 2.8),
      propagatedDefectCount,
    });
  }

  return layers;
}

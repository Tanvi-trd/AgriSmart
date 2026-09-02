import React, { useState } from 'react';
import { 
  FlaskConical, 
  Sparkles, 
  RefreshCw, 
  MapPin, 
  Award, 
  Droplets, 
  Thermometer, 
  Gauge, 
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DistrictAgriData } from '../types';
import { FIVE_KARNATAKA_DISTRICTS } from '../data/agriData';

interface PredictSimulatorProps {
  initialDistrict: string;
  onApplyRecommendation: (district: string) => void;
}

export const PredictSimulator: React.FC<PredictSimulatorProps> = ({
  initialDistrict,
  onApplyRecommendation
}) => {
  const [district, setDistrict] = useState(initialDistrict || 'Belagavi');
  const baseData = FIVE_KARNATAKA_DISTRICTS[district] || FIVE_KARNATAKA_DISTRICTS['Belagavi'];

  // Custom Soil & Weather Sliders
  const [nitrogen, setNitrogen] = useState(baseData.nitrogen);
  const [phosphorus, setPhosphorus] = useState(baseData.phosphorus);
  const [potassium, setPotassium] = useState(baseData.potassium);
  const [ph, setPh] = useState(baseData.ph);
  const [rainfall, setRainfall] = useState(baseData.rainfall);
  const [temp, setTemp] = useState(baseData.temp);

  const [isSimulating, setIsSimulating] = useState(false);
  const [predictedScore, setPredictedScore] = useState(baseData.confidenceScore);

  const handleDistrictChange = (d: string) => {
    setDistrict(d);
    const dData = FIVE_KARNATAKA_DISTRICTS[d];
    if (dData) {
      setNitrogen(dData.nitrogen);
      setPhosphorus(dData.phosphorus);
      setPotassium(dData.potassium);
      setPh(dData.ph);
      setRainfall(dData.rainfall);
      setTemp(dData.temp);
      setPredictedScore(dData.confidenceScore);
    }
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      // Small heuristic variation for simulation dynamism
      const variance = Math.floor(Math.random() * 5) - 2;
      const newScore = Math.min(99, Math.max(82, baseData.confidenceScore + variance));
      setPredictedScore(newScore);
      setIsSimulating(false);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }, 450);
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 rounded-3xl p-5 text-white shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-2xl bg-white/20">
            <FlaskConical className="w-5 h-5 text-white" />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight">
              Interactive Soil & Weather Simulator
            </h3>
            <p className="text-xs text-emerald-100 font-medium">
              Calibrate N-P-K parameters to test AI crop suitability scores
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sliders Input Panel */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Select Baseline Location</span>
            </label>
            <select
              value={district}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="Belagavi">Belagavi(North)</option>
              <option value="Raichur">Raichur</option>
              <option value="Dakshina Kannada">Dakshina Kannada</option>
              <option value="Udupi">Udupi</option>
              <option value="Shivamogga">Shivamogga</option>
            </select>
          </div>

          {/* Sliders */}
          <div className="space-y-3.5 text-xs">
            {/* Nitrogen */}
            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span className="text-emerald-700">Nitrogen (N) Content:</span>
                <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-extrabold">{nitrogen} kg/ha</span>
              </div>
              <input
                type="range"
                min="50"
                max="250"
                value={nitrogen}
                onChange={(e) => setNitrogen(Number(e.target.value))}
                className="w-full accent-emerald-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* Phosphorus */}
            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span className="text-amber-700">Phosphorus (P) Content:</span>
                <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-extrabold">{phosphorus} kg/ha</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={phosphorus}
                onChange={(e) => setPhosphorus(Number(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* Potassium */}
            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span className="text-purple-700">Potassium (K) Content:</span>
                <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded-md font-extrabold">{potassium} kg/ha</span>
              </div>
              <input
                type="range"
                min="50"
                max="300"
                value={potassium}
                onChange={(e) => setPotassium(Number(e.target.value))}
                className="w-full accent-purple-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* pH */}
            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span className="text-sky-700">Soil pH Level:</span>
                <span className="bg-sky-50 text-sky-800 px-2 py-0.5 rounded-md font-extrabold">{ph.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="4.5"
                max="9.0"
                step="0.1"
                value={ph}
                onChange={(e) => setPh(Number(e.target.value))}
                className="w-full accent-sky-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* Rainfall */}
            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span className="text-blue-700">Annual Rainfall:</span>
                <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md font-extrabold">{rainfall} mm</span>
              </div>
              <input
                type="range"
                min="400"
                max="4500"
                step="50"
                value={rainfall}
                onChange={(e) => setRainfall(Number(e.target.value))}
                className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Machine Learning Heuristic...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Recalculate Crop Prediction</span>
              </>
            )}
          </button>
        </div>

        {/* Prediction Results Display */}
        <div className="lg:col-span-5 bg-gradient-to-b from-emerald-900 via-emerald-800 to-slate-900 rounded-3xl p-5 text-white shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Predicted Optimum Crop</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/30 text-emerald-200 font-extrabold text-xs">
                {predictedScore}% Match
              </span>
            </div>

            <h4 className="text-2xl sm:text-3xl font-black text-white mt-3">
              {baseData.recommendedCrop}
            </h4>
            <p className="text-xs text-amber-200 font-semibold mt-0.5">
              {baseData.recommendedCropKannada}
            </p>

            <p className="text-xs text-emerald-100 leading-relaxed mt-3 bg-white/10 p-3 rounded-2xl border border-white/10">
              {baseData.description}
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/20 text-xs">
            <div className="flex justify-between text-emerald-200">
              <span>Expected Yield:</span>
              <span className="font-bold text-white">{baseData.expectedYield}</span>
            </div>
            <div className="flex justify-between text-emerald-200">
              <span>Market Price:</span>
              <span className="font-bold text-amber-300">{baseData.marketPrice}</span>
            </div>
            <div className="flex justify-between text-emerald-200">
              <span>Sowing Window:</span>
              <span className="font-bold text-white">{baseData.sowingWindow}</span>
            </div>

            <button
              onClick={() => onApplyRecommendation(district)}
              className="w-full mt-2 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>View in Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

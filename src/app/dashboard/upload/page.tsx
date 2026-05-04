"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import { ChevronRight, Camera, Check, ArrowLeft, Loader2, User, Phone, Hash } from "lucide-react";

export default function UploadPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form Data
  const [plateNumber, setPlateNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Identity state
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);

  // Get agent info on mount
  useEffect(() => {
    setAgentId(localStorage.getItem("agent_id"));
    setAgentName(localStorage.getItem("agent_name"));
  }, []);

  const handleUpload = async () => {
    if (!imageFile || !agentId) {
      alert("Error: Agent ID missing. Please log in again.");
      return;
    }
    setLoading(true);

    try {
      // 1. Upload Image to the 'stickers' bucket
      const fileName = `${Date.now()}-${imageFile.name.replace(/\s/g, '_')}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from("stickers")
        .upload(fileName, imageFile);

      if (storageError) throw storageError;

      // 2. Get the public link
      const { data: { publicUrl } } = supabase.storage
        .from("stickers")
        .getPublicUrl(fileName);

      // 3. Save everything to 'sticker_uploads'
      // We use the agentId from state to ensure it matches exactly what the dashboard queries
      const { error: dbError } = await supabase
        .from("sticker_uploads")
        .insert([{
          agent_id: agentId, 
          agent_name: agentName || "Unknown Agent",
          plate_number: plateNumber,
          driver_name: driverName,
          driver_phone: driverPhone,
          image_url: publicUrl
        }]);

      if (dbError) throw dbError;

      // Force a re-fetch of the data before moving to success
      router.refresh();
      setStep(5); 
    } catch (err: any) {
      alert(`Upload Failed: ${err.message || "Check your connection"}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-lg">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= s ? "bg-[#8b5cf6]" : "bg-white/10"}`} />
          ))}
        </div>

        <div className="glass-card p-8 border border-white/10 rounded-3xl bg-white/5 backdrop-blur-xl shadow-2xl">
          
          {/* STEP 1: PLATE NUMBER */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <div className="flex items-center gap-2 mb-2 text-[#8b5cf6]">
                <Hash size={20} />
                <span className="text-sm font-bold uppercase tracking-widest">Step 01</span>
              </div>
              <h2 className="text-3xl font-bold mb-2 text-white">Vehicle Plate</h2>
              <p className="text-gray-500 mb-8">Enter the vehicle's plate number clearly.</p>
              <input 
                autoFocus
                type="text"
                placeholder="e.g. AA-B12345"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl outline-none focus:border-[#8b5cf6] transition-all placeholder:text-gray-700 text-white"
              />
              <button 
                disabled={!plateNumber}
                onClick={() => setStep(2)}
                className="mt-8 w-full bg-[#8b5cf6] hover:bg-[#7c3aed] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* STEP 2: DRIVER NAME */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <button onClick={() => setStep(1)} className="text-gray-500 flex items-center gap-1 mb-4 text-sm hover:text-white transition-colors">
                <ArrowLeft size={14}/> Back
              </button>
              <div className="flex items-center gap-2 mb-2 text-[#8b5cf6]">
                <User size={20} />
                <span className="text-sm font-bold uppercase tracking-widest">Step 02</span>
              </div>
              <h2 className="text-3xl font-bold mb-2 text-white">Driver Name</h2>
              <p className="text-gray-500 mb-8">Full name of the vehicle owner/driver.</p>
              <input 
                autoFocus
                type="text"
                placeholder="Enter full name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl outline-none focus:border-[#8b5cf6] transition-all placeholder:text-gray-700 text-white"
              />
              <button 
                disabled={!driverName}
                onClick={() => setStep(3)}
                className="mt-8 w-full bg-[#8b5cf6] hover:bg-[#7c3aed] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* STEP 3: PHONE NUMBER */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <button onClick={() => setStep(2)} className="text-gray-500 flex items-center gap-1 mb-4 text-sm hover:text-white transition-colors">
                <ArrowLeft size={14}/> Back
              </button>
              <div className="flex items-center gap-2 mb-2 text-[#8b5cf6]">
                <Phone size={20} />
                <span className="text-sm font-bold uppercase tracking-widest">Step 03</span>
              </div>
              <h2 className="text-3xl font-bold mb-2 text-white">Driver Phone</h2>
              <p className="text-gray-500 mb-8">Primary contact number for the driver.</p>
              <input 
                autoFocus
                type="tel"
                placeholder="09..."
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl outline-none focus:border-[#8b5cf6] transition-all placeholder:text-gray-700 text-white"
              />
              <button 
                disabled={!driverPhone}
                onClick={() => setStep(4)}
                className="mt-8 w-full bg-[#8b5cf6] hover:bg-[#7c3aed] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* STEP 4: PHOTO */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <button onClick={() => setStep(3)} className="text-gray-500 flex items-center gap-1 mb-4 text-sm hover:text-white transition-colors">
                <ArrowLeft size={14}/> Back
              </button>
              <div className="flex items-center gap-2 mb-2 text-[#8b5cf6]">
                <Camera size={20} />
                <span className="text-sm font-bold uppercase tracking-widest">Step 04</span>
              </div>
              <h2 className="text-3xl font-bold mb-2 text-white">Sticker Photo</h2>
              <p className="text-gray-500 mb-8">Take a clear photo or upload from gallery.</p>
              
              <label className="cursor-pointer block group">
                <div className="aspect-square bg-white/5 border-2 border-dashed border-white/10 group-hover:border-[#8b5cf6]/50 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative">
                  {imageFile ? (
                    <div className="text-center p-4">
                       <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                         <Check size={32} />
                       </div>
                       <span className="text-white font-medium block truncate w-40 mx-auto">{imageFile.name}</span>
                       <span className="text-xs text-gray-500 mt-1 block">Tap to change</span>
                    </div>
                  ) : (
                    <>
                      <Camera size={48} className="text-gray-700 mb-2 group-hover:text-[#8b5cf6] transition-colors" />
                      <span className="text-gray-500 group-hover:text-gray-300">Tap to Capture / Upload</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </label>

              <button 
                disabled={!imageFile || loading}
                onClick={handleUpload}
                className="mt-8 w-full bg-[#8b5cf6] hover:bg-[#7c3aed] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-500/20 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Complete Registration"}
              </button>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === 5 && (
            <div className="text-center animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/20">
                <Check size={40} className="text-white" strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-bold mb-2 text-white">Success!</h2>
              <p className="text-gray-500 mb-8">The sticker record and photo have been securely saved.</p>
              <button 
                onClick={() => router.push("/dashboard")}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-bold transition-all active:scale-95"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
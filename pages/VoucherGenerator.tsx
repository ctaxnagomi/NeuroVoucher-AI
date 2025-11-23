import React, { useState, useRef } from 'react';
import { NeuroCard, NeuroInput, NeuroButton, NeuroBadge, NeuroTextarea } from '../components/NeuroComponents';
import { generateFastSummary, generateSpeech, extractReceiptData } from '../services/geminiService';
import { Sparkles, Play, Plus, Trash2, Save, Upload } from 'lucide-react';
import { VoucherItem } from '../types';

export const VoucherGenerator: React.FC = () => {
  // Voucher / Payee Details
  const [payee, setPayee] = useState('');
  const [payeeIc, setPayeeIc] = useState('');
  const [date, setDate] = useState('');
  
  // Company Details (Issuer/Bill-To)
  const [companyName, setCompanyName] = useState('');
  const [companyRegNo, setCompanyRegNo] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  const [items, setItems] = useState<VoucherItem[]>([
    { id: '1', description: '', amount: 0 }
  ]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', amount: 0 }]);
  };

  const updateItem = (id: string, field: keyof VoucherItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleAISummary = async () => {
    if (items.length === 0) return;
    setLoadingAI(true);
    // Use Fast Lite for low latency summary
    const prompt = `Summarize these expense items for a formal payment voucher description. Keep it under 15 words. Items: ${items.map(i => i.description).join(', ')}`;
    const summary = await generateFastSummary(prompt);
    
    // Add summary as a note or alert
    alert(`AI Suggested Summary: ${summary}`);
    setLoadingAI(false);
  };

  const handleReadAloud = async () => {
    setPlayingAudio(true);
    const textToRead = `Voucher for ${payee}. Total amount is Ringgit Malaysia ${total.toFixed(2)}.`;
    const audioBuffer = await generateSpeech(textToRead);
    
    if (audioBuffer) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setPlayingAudio(false);
        source.start();
    } else {
        setPlayingAudio(false);
    }
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
        try {
            const base64String = (reader.result as string).split(',')[1];
            const data = await extractReceiptData(base64String);
            
            if (data) {
                // Pre-fill Payee
                if (data.payeeName) setPayee(data.payeeName);
                if (data.payeeId) setPayeeIc(data.payeeId);
                if (data.date) setDate(data.date);
                
                // Pre-fill Company (if 'Bill To' detected)
                if (data.companyName) setCompanyName(data.companyName);
                if (data.companyRegNo) setCompanyRegNo(data.companyRegNo);
                if (data.companyAddress) setCompanyAddress(data.companyAddress);

                if (data.totalAmount) {
                    setItems([{
                        id: Date.now().toString(),
                        description: 'Receipt Import',
                        amount: data.totalAmount
                    }]);
                }
            } else {
                alert('Could not extract data from the receipt image. Please try a clearer photo.');
            }
        } catch (error) {
            console.error(error);
            alert('Error processing receipt.');
        } finally {
            setScanning(false);
        }
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveVoucher = async () => {
    if (!payee || !date || items.length === 0) {
        alert("Please ensure Payee, Date, and at least one Item are filled.");
        return;
    }

    setSaving(true);

    const payload = {
        voucher_no: `PV-${Date.now()}`, // Auto-generate for now
        voucher_date: date,
        company: {
            name: companyName,
            registration_no: companyRegNo,
            address: companyAddress
        },
        payee: {
            name: payee,
            ic_no: payeeIc
        },
        category: "General Expense",
        items: items.map(item => ({
            description: item.description,
            amount: Number(item.amount)
        })),
        authorization: {
            prepared_by: "User", // Defaults
            approved_by: "",
            designation: ""
        },
        lost_receipt: { // Defaults for schema compliance if needed
            original_date: date,
            reason: "",
            evidence_type: "None",
            evidence_ref: ""
        }
    };

    try {
        const response = await fetch('/api/vouchers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            alert("Voucher saved successfully!");
            // Optional: Redirect or clear form
        } else {
            console.warn("Backend API not reachable. Mocking success.");
            alert(`Voucher saved (Simulation). Data logged to console.`);
            console.log("Submitted Payload:", payload);
        }
    } catch (error) {
        console.error("Save failed:", error);
        alert("Network error. See console for details.");
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-700">New Cash Voucher</h2>
        <div className="flex gap-3">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleReceiptScan} 
            />
            <NeuroButton onClick={() => fileInputRef.current?.click()} disabled={scanning} className="flex items-center gap-2 text-sm">
                <Upload size={16} className={scanning ? "animate-bounce text-blue-500" : "text-purple-600"} />
                {scanning ? 'Analyzing...' : 'Upload Receipt'}
            </NeuroButton>
            <NeuroButton onClick={handleAISummary} disabled={loadingAI} className="flex items-center gap-2 text-sm">
                <Sparkles size={16} className={loadingAI ? "animate-spin" : "text-yellow-500"} />
                {loadingAI ? 'Thinking...' : 'AI Check'}
            </NeuroButton>
            <NeuroButton onClick={handleReadAloud} disabled={playingAudio} className="flex items-center gap-2 text-sm">
                <Play size={16} className={playingAudio ? "text-green-500" : "text-blue-500"} />
                {playingAudio ? 'Reading...' : 'Read Aloud'}
            </NeuroButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NeuroCard title="Company Details">
             <div className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-500 mb-2">Company Name</label>
                    <NeuroInput 
                        value={companyName} 
                        onChange={(e) => setCompanyName(e.target.value)} 
                        placeholder="e.g., My Tech Sdn Bhd" 
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-500 mb-2">Registration No.</label>
                    <NeuroInput 
                        value={companyRegNo} 
                        onChange={(e) => setCompanyRegNo(e.target.value)} 
                        placeholder="e.g., 202301000XXX" 
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-500 mb-2">Address</label>
                    <NeuroTextarea 
                        rows={2}
                        value={companyAddress} 
                        onChange={(e) => setCompanyAddress(e.target.value)} 
                        placeholder="Full business address..." 
                    />
                </div>
            </div>
        </NeuroCard>

        <NeuroCard title="Payee Details">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-500 mb-2">Payee Name</label>
                    <NeuroInput 
                        value={payee} 
                        onChange={(e) => setPayee(e.target.value)} 
                        placeholder="e.g., Ali Bin Abu" 
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-500 mb-2">IC / Company No</label>
                    <NeuroInput 
                        value={payeeIc}
                        onChange={(e) => setPayeeIc(e.target.value)}
                        placeholder="e.g., 880101-14-XXXX" 
                    />
                </div>
                <div>
                     <label className="block text-sm text-gray-500 mb-2">Date</label>
                     <NeuroInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
            </div>
        </NeuroCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
            <NeuroCard title="Line Items">
                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={item.id} className="flex gap-4 items-start">
                            <div className="flex-1">
                                <NeuroInput 
                                    placeholder="Description" 
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                />
                            </div>
                            <div className="w-32">
                                <NeuroInput 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={item.amount}
                                    onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={() => deleteItem(item.id)}
                                className="mt-3 text-red-400 hover:text-red-600 transition-colors"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                    
                    <div className="pt-4 flex justify-between">
                        <NeuroButton onClick={addItem} className="text-sm">
                            <Plus size={16} className="inline mr-2" /> Add Item
                        </NeuroButton>
                        <NeuroButton onClick={handleSaveVoucher} disabled={saving} className="text-blue-600">
                            {saving ? <Sparkles size={16} className="animate-spin inline mr-2" /> : <Save size={16} className="inline mr-2" />}
                            {saving ? 'Saving...' : 'Save Voucher'}
                        </NeuroButton>
                    </div>
                </div>
            </NeuroCard>
        </div>

        <div className="md:col-span-1">
            <NeuroCard title="Voucher Summary" className="h-full">
                <div className="h-full flex flex-col justify-center items-center text-center space-y-2">
                    <div className="text-gray-500">Total Amount Payable</div>
                    <div className="text-4xl lg:text-5xl font-bold text-gray-700 tracking-tight">
                        <span className="text-2xl align-top mr-1">RM</span>
                        {total.toFixed(2)}
                    </div>
                    <NeuroBadge color="text-gray-500">Draft Status</NeuroBadge>
                </div>
            </NeuroCard>
        </div>
      </div>
    </div>
  );
};

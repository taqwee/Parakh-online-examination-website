/**
 * src/pages/CompleteProfile.jsx
 * Candidate Profile Setup with Stream / Department Dropdown
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { UserCheck, Building, BookOpen, Phone, Hash, ArrowRight, Loader2 } from 'lucide-react';

const DEPARTMENT_OPTIONS = [
  'Information Technology',
  'Computer Science & Engineering',
  'Electronics & Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'JEE Mains & Advanced (Engineering Prep)',
  'NEET UG (Medical Entrance Prep)',
  'Higher Secondary / 12th Standard',
  'Secondary / 10th Standard',
  'Other / General Studies'
];

export const CompleteProfile = () => {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(DEPARTMENT_OPTIONS[0]);
  const [institution, setInstitution] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setRollNumber(profile.roll_number || '');
      setPhone(profile.phone || '');
      setDepartment(profile.department || DEPARTMENT_OPTIONS[0]);
      setInstitution(profile.institution || '');
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || !rollNumber.trim() || !institution.trim() || !phone.trim()) {
      setErrorMessage('Please fill in all mandatory fields.');
      return;
    }

    setSaving(true);
    try {
      // Get active user ID safely
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = profile?.id || user?.id;

      if (!targetUserId) {
        throw new Error('User session not found. Please log in again.');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          roll_number: rollNumber.trim(),
          phone: phone.trim(),
          department: department.trim(),
          institution: institution.trim(),
          is_profile_complete: true
        })
        .eq('id', targetUserId);

      if (error) throw error;

      if (refreshProfile) {
        await refreshProfile();
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('[Profile Update Error]:', err);
      setErrorMessage(err.message || 'Failed to save student profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-10 flex-1 w-full space-y-6">
        <div className="bg-white border border-[#E8E4D9] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1.5 pb-4 border-b border-[#F0ECE1]">
            <div className="inline-flex p-2.5 bg-[#E9EFF0] text-[#4A6B6C] rounded-2xl mb-2">
              <UserCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#2D3234]">Complete Student Profile</h1>
            <p className="text-xs text-[#687074]">
              Please provide your official academic credentials to link your assessment records and scorecards.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-[#F9EDED] border border-[#F2D1D1] text-[#BF5555] text-xs font-semibold rounded-xl">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#2D3234] mb-1.5">Registered Email</label>
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                className="w-full px-3.5 py-2.5 border border-[#E8E4D9] rounded-xl text-xs bg-[#FAF9F5] text-[#687074] cursor-not-allowed font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2D3234] mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8E4D9] rounded-xl text-xs bg-white text-[#2D3234] focus:ring-2 focus:ring-[#4A6B6C] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D3234] mb-1.5 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-[#687074]" /> University / Roll No *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10900123045"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8E4D9] rounded-xl text-xs bg-white text-[#2D3234] focus:ring-2 focus:ring-[#4A6B6C] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2D3234] mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#687074]" /> Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8E4D9] rounded-xl text-xs bg-white text-[#2D3234] focus:ring-2 focus:ring-[#4A6B6C] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D3234] mb-1.5 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#687074]" /> Department / Stream *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8E4D9] rounded-xl text-xs bg-white text-[#2D3234] focus:ring-2 focus:ring-[#4A6B6C] outline-none cursor-pointer"
                >
                  {DEPARTMENT_OPTIONS.map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D3234] mb-1.5 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-[#687074]" /> College / University Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MAKAUT / State Technical University"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#E8E4D9] rounded-xl text-xs bg-white text-[#2D3234] focus:ring-2 focus:ring-[#4A6B6C] outline-none"
              />
            </div>

            <div className="pt-4 border-t border-[#F0ECE1] flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-[#4A6B6C] hover:bg-[#3B5758] text-[#F8F6F0] rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Profile...
                  </>
                ) : (
                  <>
                    Save & Continue to Assessments <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CompleteProfile;
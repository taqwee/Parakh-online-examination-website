/**
 * src/pages/Profile.jsx
 * Candidate Academic Profile & Performance Records
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { 
  User, Mail, Hash, Phone, BookOpen, Building, 
  ArrowLeft, Edit3, Check, Award, TrendingUp, CheckCircle2 
} from 'lucide-react';

export const Profile = () => {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [institution, setInstitution] = useState('');
  const [saving, setSaving] = useState(false);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setRollNumber(profile.roll_number || '');
      setPhone(profile.phone || '');
      setDepartment(profile.department || '');
      setInstitution(profile.institution || '');
      loadUserStats();
    }
  }, [profile]);

  const loadUserStats = async () => {
    try {
      const { data } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'completed');
      setAttempts(data || []);
    } catch (err) {
      console.error('Failed to load user attempts:', err);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
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
        .eq('id', profile.id);

      if (error) throw error;
      if (refreshProfile) await refreshProfile();
      setIsEditing(false);
    } catch (err) {
      alert(err.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const completedCount = attempts.length;
  const avgScore = completedCount > 0
    ? (attempts.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0) / completedCount).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs font-bold text-[#687074] hover:text-[#2D3234] flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Assessments
        </button>

        {/* PROFILE HEADER HERO */}
        <div className="bg-white border border-[#E8E4D9] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#4A6B6C] text-[#F8F6F0] flex items-center justify-center font-extrabold text-2xl shadow-sm">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#2D3234]">{profile?.full_name || 'Student Candidate'}</h1>
                <span className="text-[10px] font-extrabold bg-[#EBF4EE] text-[#426E4E] border border-[#D1E6D6] px-2 py-0.5 rounded uppercase">
                  {profile?.role || 'Student'}
                </span>
              </div>
              <p className="text-xs text-[#687074] mt-0.5">{profile?.email}</p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(prev => !prev)}
            className="px-4 py-2 bg-[#FAF9F5] border border-[#E8E4D9] text-[#2D3234] hover:bg-[#EFECE1] text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#4A6B6C]" /> {isEditing ? 'Cancel Editing' : 'Edit Details'}
          </button>
        </div>

        {/* PERFORMANCE SUMMARY METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] shadow-sm text-center">
            <p className="text-[11px] font-bold text-[#687074] uppercase tracking-wider">Completed Tests</p>
            <h3 className="text-2xl font-extrabold text-[#2D3234] mt-1">{completedCount}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] shadow-sm text-center">
            <p className="text-[11px] font-bold text-[#687074] uppercase tracking-wider">Average Score</p>
            <h3 className="text-2xl font-extrabold text-[#2D3234] mt-1">{avgScore}%</h3>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white p-5 rounded-2xl border border-[#E8E4D9] shadow-sm text-center">
            <p className="text-[11px] font-bold text-[#687074] uppercase tracking-wider">Account Status</p>
            <h3 className="text-sm font-extrabold text-[#426E4E] mt-2 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Verified Candidate
            </h3>
          </div>
        </div>

        {/* DETAILS CARD / EDIT FORM */}
        <div className="bg-white border border-[#E8E4D9] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-base font-extrabold text-[#2D3234]">Academic & Contact Records</h3>

          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2D3234] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[#E8E4D9] rounded-xl text-xs bg-white text-[#2D3234] outline-none focus:ring-2 focus:ring-[#4A6B6C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D3234] mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[#E8E4D9] rounded-xl text-xs bg-white text-[#2D3234] outline-none focus:ring-2 focus:ring-[#4A6B6C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D3234] mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[#E8E4D9] rounded-xl text-xs bg-white text-[#2D3234] outline-none focus:ring-2 focus:ring-[#4A6B6C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D3234] mb-1">Department / Stream</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[#E8E4D9] rounded-xl text-xs bg-white text-[#2D3234] outline-none focus:ring-2 focus:ring-[#4A6B6C]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2D3234] mb-1">Institution / College Name</label>
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[#E8E4D9] rounded-xl text-xs bg-white text-[#2D3234] outline-none focus:ring-2 focus:ring-[#4A6B6C]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#F0ECE1]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-[#FAF9F5] text-[#687074] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#4A6B6C] hover:bg-[#3B5758] text-[#F8F6F0] rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D9]">
                <p className="text-[11px] font-bold text-[#687074] uppercase">University Roll Number</p>
                <p className="text-sm font-extrabold text-[#2D3234] mt-0.5">{profile?.roll_number || 'Not provided'}</p>
              </div>
              <div className="p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D9]">
                <p className="text-[11px] font-bold text-[#687074] uppercase">Contact Phone</p>
                <p className="text-sm font-extrabold text-[#2D3234] mt-0.5">{profile?.phone || 'Not provided'}</p>
              </div>
              <div className="p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D9]">
                <p className="text-[11px] font-bold text-[#687074] uppercase">Department / Stream</p>
                <p className="text-sm font-extrabold text-[#2D3234] mt-0.5">{profile?.department || 'Not provided'}</p>
              </div>
              <div className="p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D9]">
                <p className="text-[11px] font-bold text-[#687074] uppercase">Institution</p>
                <p className="text-sm font-extrabold text-[#2D3234] mt-0.5">{profile?.institution || 'Not provided'}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
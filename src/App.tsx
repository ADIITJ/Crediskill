/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  Shield, 
  Code, 
  Image as ImageIcon, 
  Video, 
  CheckCircle, 
  AlertCircle, 
  LogOut, 
  User, 
  Briefcase, 
  ChevronRight,
  Award,
  Zap,
  Clock,
  Send,
  Loader2,
  Upload,
  Camera,
  Play,
  Plus,
  ArrowRight,
  Globe,
  Cpu,
  Layers,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Role = 'student' | 'recruiter' | 'admin';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  badges: string[];
}

interface Task {
  id?: string;
  title: string;
  scenario: string;
  requirements: string[];
  starterCode?: string;
  skill: string;
  difficulty: string;
  submissionType: 'code' | 'image' | 'video';
  submissionInstructions?: string;
}

interface Submission {
  id?: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  content: string;
  type: string;
  score: number;
  status: 'pending' | 'verified' | 'failed';
  feedback: string[];
  timestamp: any;
}

interface AntiCheatQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

// --- Components ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-white text-center">
          <AlertCircle className="h-24 w-24 text-red-500 mb-6" />
          <h2 className="text-4xl font-black uppercase mb-4 tracking-tighter">Something went wrong</h2>
          <p className="font-bold uppercase opacity-60 mb-8 max-w-md">
            An unexpected error occurred. Please refresh the page or try again later.
          </p>
          <Button onClick={() => window.location.reload()}>REFRESH PAGE</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Button = ({ className, children, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'accent' }) => {
  const variants = {
    primary: "bg-white hover:bg-[#00FF00]",
    secondary: "bg-black text-white hover:bg-[#00FF00] hover:text-black",
    accent: "bg-[#FFD700] hover:bg-[#FF69B4]"
  };
  return (
    <button className={cn("brutal-button", variants[variant], className)} {...props}>
      {children}
    </button>
  );
};

const Card = ({ className, children, onClick, hover = true }: { className?: string; children: React.ReactNode; onClick?: () => void; hover?: boolean }) => (
  <div 
    className={cn(
      "brutal-card", 
      hover && "hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]",
      className
    )} 
    onClick={onClick}
  >
    {children}
  </div>
);

const Badge = ({ children, color = "bg-[#00FF00]", className }: { children: React.ReactNode; color?: string; className?: string }) => (
  <span className={cn("brutal-border px-3 py-1 text-[10px] font-black uppercase tracking-widest", color, className)}>
    {children}
  </span>
);

const MediaUpload = ({ type, onUpload }: { type: 'image' | 'video'; onUpload: (base64: string, mimeType: string) => void }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setPreview(reader.result as string);
      onUpload(base64, file.type);
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 brutal-border bg-white">
      {preview ? (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {type === 'image' ? (
            <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain brutal-border" />
          ) : (
            <video src={preview} controls className="max-h-full max-w-full brutal-border" />
          )}
          <button 
            onClick={() => setPreview(null)}
            className="absolute top-2 right-2 bg-red-500 text-white p-2 brutal-border font-bold uppercase text-xs"
          >
            Remove
          </button>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center w-full h-full border-4 border-dashed border-black cursor-pointer hover:bg-[#00FF00] transition-colors"
        >
          {type === 'image' ? <Camera className="h-16 w-16 mb-4" /> : <Play className="h-16 w-16 mb-4" />}
          <p className="text-xl font-black uppercase">Click to upload {type}</p>
          <p className="text-sm font-bold opacity-60">or drag and drop</p>
          {loading && <Loader2 className="animate-spin mt-4" />}
        </div>
      )}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFile} 
        accept={type === 'image' ? "image/*" : "video/*"} 
        className="hidden" 
      />
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'hub' | 'recruiter'>('hub');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Default to student if new user
          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email!,
            displayName: u.displayName || 'Anonymous',
            role: 'student',
            badges: []
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#FFFFFF]">
      <Loader2 className="h-12 w-12 animate-spin text-black" />
    </div>
  );

  if (!user) return <Landing onLogin={login} />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FFFFFF] font-sans">
        {/* Header */}
        <header className="brutal-border sticky top-0 z-50 flex items-center justify-between bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 fill-[#00FF00]" />
            <h1 className="text-3xl font-black uppercase tracking-tighter">Crediskill</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {profile?.role === 'recruiter' && (
              <div className="flex brutal-border overflow-hidden">
                <button 
                  onClick={() => setView('hub')}
                  className={cn("px-4 py-2 font-bold uppercase", view === 'hub' ? "bg-[#00FF00]" : "bg-white")}
                >
                  Student
                </button>
                <button 
                  onClick={() => setView('recruiter')}
                  className={cn("px-4 py-2 font-bold uppercase border-l-4 border-black", view === 'recruiter' ? "bg-[#00FF00]" : "bg-white")}
                >
                  Recruiter
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-3 brutal-border bg-white px-3 py-1.5">
              <div className="text-right">
                <p className="text-sm font-bold leading-none">{profile?.displayName}</p>
                <button 
                  onClick={async () => {
                    const newRole = profile?.role === 'student' ? 'recruiter' : 'student';
                    const userRef = doc(db, 'users', user.uid);
                    await setDoc(userRef, { role: newRole }, { merge: true });
                    setProfile(prev => prev ? { ...prev, role: newRole } : null);
                  }}
                  className="text-[10px] uppercase opacity-60 hover:text-[#00FF00] font-bold"
                >
                  {profile?.role} (Toggle)
                </button>
              </div>
              <div className="h-8 w-8 brutal-border bg-[#00FF00] flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <button onClick={logout} className="hover:text-red-600">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-8">
          {view === 'hub' ? <StudentHub profile={profile!} /> : <RecruiterDashboard />}
        </main>
      </div>
    </ErrorBoundary>
  );
}

function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Marquee */}
      <div className="marquee-container">
        <div className="marquee-content">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="mx-8">VERIFIED SKILLS ONLY • NO FLUFF • AI POWERED • PROOF OF WORK • </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-44px)]">
        {/* Left: Hero */}
        <div className="p-12 flex flex-col justify-center border-r-4 border-black">
          <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="mb-8"
          >
            <Shield className="h-24 w-24 fill-[#00FF00]" />
          </motion.div>
          
          <h1 className="text-[12vw] lg:text-[10vw] font-black uppercase tracking-tighter leading-[0.85] mb-8">
            SHOW,<br />DON'T<br /><span className="text-[#00FF00] stroke-black stroke-2">TELL.</span>
          </h1>
          
          <p className="text-2xl font-bold max-w-md mb-12 uppercase tracking-tight">
            The next-generation skill verification platform. Prove your expertise with real-time, AI-verified assessments.
          </p>
          
          <div className="flex gap-4">
            <Button onClick={onLogin} className="text-2xl px-12 py-6 bg-[#00FF00]">
              GET VERIFIED
            </Button>
            <Button variant="secondary" className="text-2xl px-12 py-6">
              RECRUIT
            </Button>
          </div>
        </div>

        {/* Right: Features Grid */}
        <div className="bg-[#F8F9FA] p-12 grid grid-cols-1 md:grid-cols-2 gap-8 content-center">
          <Card className="bg-[#FFD700] rotate-2">
            <Code className="h-12 w-12 mb-4" />
            <h3 className="text-2xl font-black uppercase mb-2">Code Integrity</h3>
            <p className="font-bold text-sm">Real-time anti-cheat challenges that verify you actually understand the code you write.</p>
          </Card>
          
          <Card className="bg-white -rotate-3">
            <Zap className="h-12 w-12 mb-4" />
            <h3 className="text-2xl font-black uppercase mb-2">AI Evaluation</h3>
            <p className="font-bold text-sm">Instant, objective grading powered by Gemini 2.5 Flash. Get verified in minutes.</p>
          </Card>
          
          <Card className="bg-[#FF69B4] rotate-1">
            <Award className="h-12 w-12 mb-4" />
            <h3 className="text-2xl font-black uppercase mb-2">Proof of Work</h3>
            <p className="font-bold text-sm">Build a portfolio of verified badges that recruiters can trust implicitly.</p>
          </Card>
          
          <Card className="bg-black text-white -rotate-1">
            <Globe className="h-12 w-12 mb-4 text-[#00FF00]" />
            <h3 className="text-2xl font-black uppercase mb-2">Multimodal</h3>
            <p className="font-bold text-sm">Submit code, designs, or videos. Our AI analyzes visual and auditory quality.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StudentHub({ profile }: { profile: UserProfile }) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [customType, setCustomType] = useState<'code' | 'image' | 'video'>('code');
  const [customDiff, setCustomDiff] = useState('intermediate');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'submissions'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission)));
    });
  }, [profile.uid]);

  const handleCustomGenerate = async () => {
    if (!customSkill) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: customSkill, difficulty: customDiff, submissionType: customType })
      });
      const task = await res.json();
      setActiveTask({ ...task, skill: customSkill, difficulty: customDiff, submissionType: customType });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  if (activeTask) return <TaskSession task={activeTask} profile={profile} onCancel={() => setActiveTask(null)} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Assessments */}
      <div className="lg:col-span-8 space-y-12">
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-6xl font-black uppercase tracking-tighter leading-none">Assessments</h2>
              <p className="font-bold uppercase opacity-60 mt-2">Choose a path or create your own</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkillCard 
              title="React Architecture" 
              skill="React" 
              type="code" 
              diff="intermediate"
              onSelect={setActiveTask}
              color="bg-[#00FF00]"
            />
            <SkillCard 
              title="Visual Identity Design" 
              skill="UI Design" 
              type="image" 
              diff="advanced"
              onSelect={setActiveTask}
              color="bg-[#FF69B4]"
            />
            <SkillCard 
              title="Digital Painting" 
              skill="Painting" 
              type="image" 
              diff="intermediate"
              onSelect={setActiveTask}
              color="bg-[#FF69B4]"
            />
            <SkillCard 
              title="Technical Presentation" 
              skill="Communication" 
              type="video" 
              diff="intermediate"
              onSelect={setActiveTask}
              color="bg-[#FFD700]"
            />
            
            {/* Custom Generator Card */}
            <Card className="bg-black text-white flex flex-col justify-between p-8" hover={false}>
              <div>
                <div className="flex justify-between items-start mb-6">
                  <Plus className="h-10 w-10 text-[#00FF00]" />
                  <Badge color="bg-[#00FF00] text-black">Dynamic</Badge>
                </div>
                <h3 className="text-2xl font-black uppercase mb-4">Custom Challenge</h3>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="ENTER ANY SKILL (e.g. Oil Painting)"
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    className="w-full bg-white text-black brutal-border px-4 py-2 font-bold uppercase placeholder:opacity-40"
                  />
                  <div className="flex gap-2">
                    {(['code', 'image', 'video'] as const).map(t => (
                      <button 
                        key={t}
                        onClick={() => setCustomType(t)}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-black uppercase brutal-border transition-colors",
                          customType === t ? "bg-[#00FF00] text-black" : "bg-white text-black"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleCustomGenerate} 
                disabled={isGenerating || !customSkill}
                className="mt-6 w-full bg-[#00FF00] text-black"
              >
                {isGenerating ? <Loader2 className="animate-spin mx-auto" /> : "GENERATE TASK"}
              </Button>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-4xl font-black uppercase mb-8 flex items-center gap-3">
            <Award className="h-8 w-8 text-[#FFD700]" />
            Verification History
          </h2>
          <div className="space-y-4">
            {submissions?.map(sub => (
              <Card key={sub.id} className="flex items-center justify-between py-6 group hover:bg-black hover:text-white transition-colors">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "h-16 w-16 brutal-border flex items-center justify-center",
                    sub.status === 'verified' ? "bg-[#00FF00]" : "bg-red-400"
                  )}>
                    {sub.type === 'code' ? <Code /> : sub.type === 'image' ? <ImageIcon /> : <Video />}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black uppercase tracking-tight">{sub.taskTitle}</h4>
                    <div className="flex gap-3 mt-1 items-center">
                      <Badge color={sub.status === 'verified' ? 'bg-[#00FF00] text-black' : 'bg-red-400'}>
                        {sub.status}
                      </Badge>
                      <span className="text-[10px] font-mono opacity-60 uppercase">
                        {sub.timestamp ? new Date(sub.timestamp.toDate()).toLocaleDateString() : 'RECENT'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-black tracking-tighter">{sub.score}%</p>
                </div>
              </Card>
            ))}
            {(!submissions || submissions.length === 0) && (
              <div className="p-20 text-center brutal-border border-dashed border-4 opacity-20">
                <p className="text-2xl font-black uppercase">Your proof-of-work will appear here</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Right Column: Sidebar */}
      <div className="lg:col-span-4 space-y-8">
        <Card className="bg-[#00FF00] p-8">
          <div className="flex items-center gap-3 mb-6">
            <Award className="h-8 w-8" />
            <h3 className="text-3xl font-black uppercase tracking-tighter">Badges</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {profile.badges?.map(b => (
              <div key={b} className="brutal-border bg-white p-3 flex flex-col items-center gap-2 aspect-square justify-center text-center">
                <Zap className="h-6 w-6 text-[#FFD700] fill-[#FFD700]" />
                <span className="text-[8px] font-black uppercase leading-tight">{b}</span>
              </div>
            ))}
            {(!profile.badges || profile.badges.length === 0) && (
              <div className="col-span-3 py-8 text-center opacity-60 font-bold uppercase text-xs">
                No badges earned yet
              </div>
            )}
          </div>
        </Card>
        
        <Card className="bg-[#FFD700] p-8">
          <h3 className="text-2xl font-black uppercase mb-4 flex items-center gap-2">
            <Search className="h-6 w-6" />
            Recruiter View
          </h3>
          <p className="font-bold text-sm leading-relaxed uppercase">
            Recruiters prioritize candidates with "Verified" status. Our AI checks for plagiarism and code logic understanding.
          </p>
          <div className="mt-6 p-4 bg-white brutal-border font-mono text-[10px] uppercase">
            Status: Active<br />
            Visibility: Public<br />
            Trust Score: High
          </div>
        </Card>

        <Card className="bg-black text-white p-8">
          <h3 className="text-2xl font-black uppercase mb-4">Platform Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold uppercase opacity-60">Total Verifications</span>
              <span className="text-3xl font-black text-[#00FF00]">1,284</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold uppercase opacity-60">AI Trust Index</span>
              <span className="text-3xl font-black text-[#00FF00]">99.2%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SkillCard({ title, skill, type, diff, onSelect, color = "bg-white" }: { 
  title: string; 
  skill: string; 
  type: 'code' | 'image' | 'video'; 
  diff: string;
  onSelect: (t: Task) => void;
  color?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, difficulty: diff, submissionType: type })
      });
      const task = await res.json();
      onSelect({ ...task, skill, difficulty: diff, submissionType: type });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={cn("group transition-all cursor-pointer p-8 flex flex-col justify-between min-h-[240px]", color)} onClick={handleStart}>
      <div>
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 brutal-border bg-white">
            {type === 'code' && <Code className="h-8 w-8" />}
            {type === 'image' && <ImageIcon className="h-8 w-8" />}
            {type === 'video' && <Video className="h-8 w-8" />}
          </div>
          <Badge color="bg-white">{diff}</Badge>
        </div>
        <h3 className="text-3xl font-black uppercase leading-none tracking-tighter mb-2">{title}</h3>
      </div>
      <div className="flex items-center justify-between mt-8">
        <span className="text-xs font-black uppercase tracking-widest opacity-60">{skill}</span>
        <div className="h-10 w-10 brutal-border bg-white flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
          {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
        </div>
      </div>
    </Card>
  );
}

function TaskSession({ task, profile, onCancel }: { task: Task; profile: UserProfile; onCancel: () => void }) {
  const [code, setCode] = useState(task.starterCode || '');
  const [mediaData, setMediaData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [showAntiCheat, setShowAntiCheat] = useState(false);
  const [antiCheatQuestion, setAntiCheatQuestion] = useState<AntiCheatQuestion | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [antiCheatStats, setAntiCheatStats] = useState({ total: 0, correct: 0 });

  const lastVerificationCount = useRef(0);

  useEffect(() => {
    if (task.submissionType === 'code' && code.length - lastVerificationCount.current >= 50) {
      triggerAntiCheat();
      lastVerificationCount.current = code.length;
    }
    setCharCount(code.length);
  }, [code]);

  const triggerAntiCheat = async () => {
    try {
      const res = await fetch('/api/generate-anti-cheat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const question = await res.json();
      setAntiCheatQuestion(question);
      setShowAntiCheat(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAntiCheatAnswer = (index: number) => {
    const isCorrect = index === antiCheatQuestion?.correctIndex;
    setAntiCheatStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0)
    }));
    setShowAntiCheat(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const submission = task.submissionType === 'code' ? code : mediaData?.base64;
      if (!submission) {
        alert("Please provide a submission.");
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/evaluate-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task, 
          submission, 
          type: task.submissionType,
          mimeType: mediaData?.mimeType
        })
      });
      const evalResult = await res.json();
      
      const subData: Submission = {
        userId: profile.uid,
        taskId: task.id || 'generated',
        taskTitle: task.title,
        content: task.submissionType === 'code' ? code : `[${task.submissionType} submission]`,
        type: task.submissionType,
        score: evalResult.score,
        status: evalResult.status,
        feedback: evalResult.feedback,
        timestamp: Timestamp.now()
      };
      
      await addDoc(collection(db, 'submissions'), subData);
      
      if (evalResult.status === 'verified') {
        const userRef = doc(db, 'users', profile.uid);
        if (!profile.badges.includes(task.skill)) {
          await setDoc(userRef, { badges: [...profile.badges, task.skill] }, { merge: true });
        }
      }
      
      setResult(evalResult);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) return (
    <div className="max-w-4xl mx-auto py-12">
      <Card className={cn("text-center p-16", result.status === 'verified' ? "bg-[#00FF00]" : "bg-red-400")}>
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
        >
          {result.status === 'verified' ? <Award className="h-32 w-32 mx-auto mb-8" /> : <AlertCircle className="h-32 w-32 mx-auto mb-8" />}
        </motion.div>
        
        <h2 className="text-8xl font-black uppercase tracking-tighter leading-none mb-4">
          {result.score}%
        </h2>
        <p className="text-3xl font-black uppercase tracking-tight mb-12">
          Status: {result.status}
        </p>
        
        <div className="text-left space-y-6 bg-white brutal-border p-10 mb-12">
          <h4 className="text-2xl font-black uppercase tracking-tighter border-b-4 border-black pb-2">AI Feedback</h4>
          <div className="space-y-4">
            {result.feedback?.map((f: string, i: number) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="h-6 w-6 brutal-border bg-[#00FF00] flex-shrink-0 mt-1" />
                <p className="font-bold text-lg leading-tight uppercase">{f}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-4">
          <Button onClick={onCancel} className="flex-1 bg-white text-2xl py-6">EXIT SESSION</Button>
          {result.status === 'verified' && (
            <Button className="flex-1 bg-black text-white text-2xl py-6">VIEW BADGE</Button>
          )}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Session Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="brutal-border p-2 hover:bg-black hover:text-white transition-colors">
            <ChevronRight className="rotate-180 h-6 w-6" />
          </button>
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{task.title}</h2>
            <div className="flex gap-2 mt-1">
              <Badge color="bg-black text-white">{task.skill}</Badge>
              <Badge color="bg-[#FFD700] text-black">{task.difficulty}</Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {task.submissionType === 'code' && (
            <div className="hidden md:flex items-center gap-4 brutal-border px-4 py-2 bg-white">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase opacity-60">Integrity Score</p>
                <p className="text-xl font-black leading-none">
                  {antiCheatStats.total > 0 ? Math.round((antiCheatStats.correct / antiCheatStats.total) * 100) : 100}%
                </p>
              </div>
              <Shield className={cn("h-8 w-8", antiCheatStats.correct === antiCheatStats.total ? "text-[#00FF00]" : "text-red-500")} />
            </div>
          )}
          <Button onClick={handleSubmit} disabled={submitting} className="bg-[#00FF00] px-8 py-4 text-xl">
            {submitting ? <Loader2 className="animate-spin" /> : "SUBMIT PROOF"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-hidden">
        {/* Left: Instructions */}
        <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-4">
          <Card className="bg-white">
            <h4 className="text-xl font-black uppercase mb-4 border-b-4 border-black pb-2">Scenario</h4>
            <p className="font-bold text-lg leading-tight uppercase mb-6">{task.scenario}</p>
            
            <h4 className="text-xl font-black uppercase mb-4 border-b-4 border-black pb-2">Requirements</h4>
            <ul className="space-y-3">
              {task.requirements?.map((r, i) => (
                <li key={i} className="flex items-start gap-3 font-bold text-sm uppercase">
                  <div className="h-5 w-5 brutal-border bg-[#00FF00] flex-shrink-0 mt-0.5" />
                  {r}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="bg-[#FFD700]">
            <h4 className="text-xl font-black uppercase mb-2">Instructions</h4>
            <p className="font-bold text-sm uppercase leading-relaxed">
              {task.submissionInstructions || "Submit your work using the interface on the right. Our AI will evaluate your submission based on the requirements provided."}
            </p>
          </Card>

          {task.submissionType === 'code' && (
            <Card className="bg-black text-white">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-black uppercase">Real-time Monitor</h4>
                <div className="h-3 w-3 rounded-full bg-[#00FF00] animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase opacity-60">
                  <span>Progress to next check</span>
                  <span>{charCount % 50}/50 chars</span>
                </div>
                <div className="w-full bg-white/20 h-4 brutal-border overflow-hidden">
                  <motion.div 
                    className="bg-[#00FF00] h-full" 
                    initial={false}
                    animate={{ width: `${(charCount % 50) * 2}%` }}
                  />
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Workspace */}
        <div className="lg:col-span-8 brutal-border bg-black relative flex flex-col">
          <div className="bg-white border-b-4 border-black px-4 py-2 flex items-center justify-between">
            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500 brutal-border" />
              <div className="h-3 w-3 rounded-full bg-yellow-500 brutal-border" />
              <div className="h-3 w-3 rounded-full bg-green-500 brutal-border" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              Workspace // {task.submissionType.toUpperCase()}
            </span>
          </div>
          
          <div className="flex-1 relative overflow-hidden">
            {task.submissionType === 'code' ? (
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full bg-[#1e1e1e] text-[#00FF00] font-mono p-8 resize-none outline-none text-xl leading-relaxed"
                placeholder="// START CODING HERE..."
                spellCheck={false}
              />
            ) : (
              <div className="h-full bg-white p-1">
                <MediaUpload 
                  type={task.submissionType as 'image' | 'video'} 
                  onUpload={(base64, mimeType) => setMediaData({ base64, mimeType })} 
                />
              </div>
            )}
            
            <AnimatePresence>
              {showAntiCheat && antiCheatQuestion && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-center justify-center p-12 bg-black/90 backdrop-blur-md"
                >
                  <Card className="max-w-xl w-full bg-white p-12">
                    <div className="flex items-center gap-3 mb-8 text-red-600">
                      <AlertCircle className="h-10 w-10" />
                      <h4 className="text-3xl font-black uppercase tracking-tighter">Integrity Check</h4>
                    </div>
                    <p className="text-2xl font-black uppercase mb-10 leading-tight">{antiCheatQuestion.question}</p>
                    <div className="grid grid-cols-1 gap-4">
                      {antiCheatQuestion.options?.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleAntiCheatAnswer(i)}
                          className="w-full text-left p-6 brutal-border hover:bg-[#00FF00] font-black uppercase transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <div className="mt-10 flex items-center gap-3 text-xs font-black uppercase opacity-40">
                      <Clock className="h-5 w-5" />
                      <span>Answer immediately to maintain verification score.</span>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecruiterDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'submissions'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => {
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission)));
    });
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-160px)]">
      {/* Left: Submission List */}
      <div className="lg:col-span-4 flex flex-col gap-6 overflow-hidden">
        <div className="flex items-end justify-between">
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Pipeline</h2>
          <Badge color="bg-black text-white">{submissions.length} Total</Badge>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {submissions?.map(sub => (
            <Card 
              key={sub.id} 
              className={cn(
                "cursor-pointer transition-all p-6",
                selected?.id === sub.id ? "bg-[#00FF00] -translate-x-1 -translate-y-1 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" : "bg-white"
              )}
              onClick={() => setSelected(sub)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-xl font-black uppercase tracking-tight leading-none">{sub.taskTitle}</h4>
                <span className="text-2xl font-black">{sub.score}%</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge color="bg-white text-[8px]">{sub.type}</Badge>
                <span className="text-[10px] font-mono opacity-60 uppercase">
                  ID: {sub.userId?.slice(0, 8)}
                </span>
              </div>
            </Card>
          ))}
          {(!submissions || submissions.length === 0) && (
            <div className="p-12 text-center brutal-border border-dashed border-4 opacity-20">
              <p className="font-black uppercase">No submissions in pipeline</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Detail View */}
      <div className="lg:col-span-8 overflow-y-auto">
        {selected ? (
          <Card className="bg-white min-h-full p-12" hover={false}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12 border-b-8 border-black pb-8">
              <div className="space-y-4">
                <Badge color="bg-[#FFD700] text-black">Verification Report</Badge>
                <h2 className="text-6xl font-black uppercase tracking-tighter leading-none">{selected.taskTitle}</h2>
                <div className="flex items-center gap-4 font-bold uppercase text-sm opacity-60">
                  <div className="flex items-center gap-1"><User className="h-4 w-4" /> {selected.userId}</div>
                  <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {selected.timestamp ? new Date(selected.timestamp.toDate()).toLocaleString() : 'RECENT'}</div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-4">
                <div className="text-8xl font-black tracking-tighter leading-none">{selected.score}%</div>
                <Badge color={selected.status === 'verified' ? 'bg-[#00FF00] text-black' : 'bg-red-400'} className="text-xl px-6 py-2">
                  {selected.status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
              {/* Submission Content */}
              <div className="space-y-6">
                <h4 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <Layers className="h-6 w-6" />
                  Artifact
                </h4>
                <div className="brutal-border bg-black p-1">
                  <div className="bg-[#1e1e1e] p-6 font-mono text-[#00FF00] text-sm h-96 overflow-auto custom-scrollbar">
                    {selected.type === 'code' ? (
                      <pre className="whitespace-pre-wrap">{selected.content}</pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-6 opacity-80">
                        <div className="p-8 brutal-border bg-white text-black">
                          {selected.type === 'image' ? <ImageIcon className="h-20 w-20" /> : <Video className="h-20 w-20" />}
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-black uppercase">Multimodal Proof</p>
                          <p className="text-xs font-bold uppercase opacity-60 mt-2">AI-Verified {selected.type} content</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              <div className="space-y-6">
                <h4 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <Cpu className="h-6 w-6" />
                  AI Analysis
                </h4>
                <div className="space-y-4">
                  <div className={cn(
                    "p-6 brutal-border flex items-center justify-between",
                    selected.status === 'verified' ? "bg-[#00FF00]" : "bg-red-400"
                  )}>
                    <span className="text-xl font-black uppercase">Trust Score</span>
                    <span className="text-4xl font-black">{selected.score}%</span>
                  </div>
                  
                  <div className="bg-[#F8F9FA] brutal-border p-6 space-y-4">
                    <h5 className="font-black uppercase text-sm border-b-2 border-black pb-1">Evaluation Points</h5>
                    {selected.feedback?.map((f, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <CheckCircle className="h-5 w-5 text-[#00FF00] flex-shrink-0 mt-0.5" />
                        <p className="font-bold text-sm uppercase leading-tight">{f}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="brutal-border p-4 bg-white">
                      <p className="text-[10px] font-black uppercase opacity-40 mb-1">Integrity</p>
                      <p className="text-lg font-black uppercase">Verified</p>
                    </div>
                    <div className="brutal-border p-4 bg-white">
                      <p className="text-[10px] font-black uppercase opacity-40 mb-1">Plagiarism</p>
                      <p className="text-lg font-black uppercase">None</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-12 border-t-4 border-black flex gap-6">
              <Button className="flex-1 bg-[#00FF00] text-xl py-6 flex items-center justify-center gap-3">
                <Briefcase className="h-6 w-6" />
                HIRE CANDIDATE
              </Button>
              <Button variant="secondary" className="flex-1 text-xl py-6">
                DOWNLOAD REPORT
              </Button>
            </div>
          </Card>
        ) : (
          <div className="h-full flex flex-col items-center justify-center brutal-border border-dashed border-4 opacity-20 p-20">
            <Search className="h-24 w-24 mb-6" />
            <p className="text-3xl font-black uppercase">Select a submission to review</p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Award, 
  Code, 
  Cpu, 
  Zap, 
  Globe, 
  User, 
  LogOut, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  ArrowRight, 
  Loader2, 
  Upload, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Layers,
  MoreVertical,
  Star,
  Mail,
  MapPin,
  BookOpen,
  Languages,
  Users,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db 
} from './firebase';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  useLocation
} from 'react-router-dom';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  updateDoc,
  increment,
  limit,
  getDocs
} from 'firebase/firestore';
import Markdown from 'react-markdown';
import { generateTask, generateAntiCheat, evaluateSubmission } from './services/gemini';

// --- Types ---
type Role = 'student' | 'recruiter' | 'admin';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  badges: string[];
  college?: string;
  languages?: string[];
  courses?: string[];
  bio?: string;
  location?: string;
  joinedAt?: any;
  companyName?: string;
  industry?: string;
  website?: string;
}

interface Task {
  id?: string;
  title: string;
  description: string;
  type: 'code' | 'image' | 'video';
  difficulty: 'beginner' | 'intermediate' | 'expert';
  submissionType: 'code' | 'image' | 'video';
}

interface Submission {
  id?: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  type: string;
  content: string;
  status: 'pending' | 'verified' | 'rejected';
  score: number;
  feedback: string[];
  reasoning?: string;
  timestamp: any;
}

// --- Components ---

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function Badge({ children, color = "bg-indigo-600 text-white", className }: { children: React.ReactNode, color?: string, className?: string }) {
  return (
    <span className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg border border-transparent", color, className)}>
      {children}
    </span>
  );
}

function Button({ children, onClick, variant = "primary", className, disabled, type = "button" }: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: "primary" | "secondary" | "danger" | "ghost", 
  className?: string,
  disabled?: boolean,
  type?: "button" | "submit"
}) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-indigo-200",
    secondary: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        "px-6 py-2.5 font-bold uppercase tracking-wider text-sm transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

function Card({ children, className, hover = true }: { children: React.ReactNode, className?: string, hover?: boolean }) {
  return (
    <div className={cn(
      "bg-white p-8 transition-all duration-500 rounded-[2.5rem] border border-slate-100",
      hover && "hover:border-indigo-200 hover:shadow-[0_30px_60px_-15px_rgba(99,102,241,0.1)]",
      className
    )}>
      {children}
    </div>
  );
}

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'demo-user',
      email: 'demo@example.com',
      emailVerified: true,
      isAnonymous: true,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = `Database Error: ${parsed.error}`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full glass p-10 rounded-[2.5rem] border border-rose-100 shadow-2xl shadow-rose-200/20 text-center">
            <div className="h-20 w-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="h-10 w-10 text-rose-500" />
            </div>
            <h2 className="text-3xl font-serif italic font-black text-slate-900 mb-4">Application Error</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">{errorMessage}</p>
            <Button onClick={() => window.location.reload()} className="w-full py-4 rounded-2xl bg-slate-900 text-white">RELOAD APPLICATION</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MediaUpload({ type, onUpload }: { type: 'image' | 'video', onUpload: (base64: string, mimeType: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onUpload(base64.split(',')[1], file.type);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div 
      className={cn(
        "border-2 border-dashed border-gray-200 rounded-3xl h-96 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30",
        isDragging ? "bg-[#00FF00]/10 border-[#00FF00]" : "bg-gray-50",
        preview && "border-solid"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept={type === 'image' ? "image/*" : "video/*"} 
        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />
      
      {preview ? (
        type === 'image' ? (
          <img src={preview} className="absolute inset-0 w-full h-full object-contain p-4" alt="Preview" referrerPolicy="no-referrer" />
        ) : (
          <video src={preview} className="absolute inset-0 w-full h-full object-contain p-4" controls />
        )
      ) : (
        <div className="text-center p-8">
          {type === 'image' ? <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-40" /> : <Video className="h-16 w-16 mx-auto mb-4 opacity-40" />}
          <p className="text-2xl font-black uppercase mb-2">Drop your {type} here</p>
          <p className="text-xs font-bold uppercase opacity-40 mb-6">or click to browse files</p>
          <Button variant="secondary" className="text-xs">SELECT {type.toUpperCase()}</Button>
        </div>
      )}
    </div>
  );
}

// --- Mock Data for Demo ---
const MOCK_STUDENT: UserProfile = {
  uid: 'demo-student-123',
  email: 'student@demo.com',
  displayName: 'Alex Rivers',
  role: 'student',
  badges: ['React Expert', 'UI/UX Master', 'Problem Solver'],
  college: 'Tech University',
  languages: ['TypeScript', 'Python', 'Rust'],
  courses: ['Advanced Web Dev', 'Data Structures'],
  bio: 'Passionate developer building the future of web apps.',
  location: 'San Francisco, CA',
  joinedAt: new Date().toISOString()
};

const MOCK_RECRUITER: UserProfile = {
  uid: 'demo-recruiter-456',
  email: 'recruiter@techcorp.com',
  displayName: 'Sarah Chen',
  role: 'recruiter',
  badges: [],
  companyName: 'TechCorp Solutions',
  industry: 'Software Engineering',
  website: 'https://techcorp.example.com',
  bio: 'Looking for top-tier talent in frontend and AI.',
  location: 'New York, NY',
  joinedAt: new Date().toISOString()
};

const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 's1',
    userId: 'demo-student-123',
    taskId: 't1',
    taskTitle: 'React Performance Optimization',
    type: 'code',
    content: 'const memoizedValue = useMemo(() => compute(a, b), [a, b]);',
    status: 'verified',
    score: 95,
    feedback: ['Excellent use of useMemo', 'Clean code structure'],
    reasoning: 'The candidate demonstrated deep understanding of React rendering cycles.',
    timestamp: new Date().toISOString()
  },
  {
    id: 's2',
    userId: 'demo-student-123',
    taskId: 't2',
    taskTitle: 'Brand Identity Design',
    type: 'image',
    content: 'https://picsum.photos/seed/design/800/600',
    status: 'verified',
    score: 88,
    feedback: ['Strong color palette', 'Consistent branding'],
    reasoning: 'The visual hierarchy is well-balanced and professional.',
    timestamp: new Date().toISOString()
  }
];

// --- Main Application ---

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('crediskill-profile');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (selectedRole: Role) => {
    const mockProfile: UserProfile = selectedRole === 'student' ? MOCK_STUDENT : MOCK_RECRUITER;
    setProfile(mockProfile);
    localStorage.setItem('crediskill-profile', JSON.stringify(mockProfile));
  };

  const handleLogout = () => {
    setProfile(null);
    localStorage.removeItem('crediskill-profile');
  };

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Landing onLogin={handleLogin} />} />
          <Route 
            path="/student/*" 
            element={
              profile?.role === 'student' ? (
                <StudentLayout onLogout={handleLogout} profile={profile} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route 
            path="/recruiter/*" 
            element={
              profile?.role === 'recruiter' ? (
                <RecruiterLayout onLogout={handleLogout} profile={profile} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

function StudentLayout({ onLogout, profile }: { onLogout: () => void, profile: UserProfile }) {
  const [currentProfile, setCurrentProfile] = useState<UserProfile>(profile);
  const navigate = useNavigate();
  const location = useLocation();
  const subView = location.pathname.split('/').pop() || 'dashboard';

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 z-50 flex items-center justify-between glass px-10 py-6 border-b border-slate-200/50 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/student/dashboard')}>
            <div className="h-11 w-11 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 group-hover:rotate-12 transition-all duration-500">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Crediskill</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-12">
          <nav className="hidden md:flex items-center gap-12">
            <button onClick={() => navigate('/student/dashboard')} className={cn("text-[11px] font-black uppercase tracking-[0.25em] transition-all hover:text-indigo-600", subView === 'dashboard' ? "text-indigo-600" : "text-slate-400")}>Dashboard</button>
            <button onClick={() => navigate('/student/skills')} className={cn("text-[11px] font-black uppercase tracking-[0.25em] transition-all hover:text-indigo-600", subView === 'skills' ? "text-indigo-600" : "text-slate-400")}>My Skills</button>
            <button onClick={() => navigate('/student/profile')} className={cn("text-[11px] font-black uppercase tracking-[0.25em] transition-all hover:text-indigo-600", subView === 'profile' ? "text-indigo-600" : "text-slate-400")}>Profile</button>
          </nav>

          <div className="flex items-center gap-6 pl-10 border-l border-slate-200">
            <div className="flex items-center gap-4 bg-white/50 px-5 py-2.5 rounded-[1.5rem] border border-slate-200 shadow-sm">
              <div className="text-right">
                <p className="text-xs font-black text-slate-900 leading-none">{currentProfile.displayName}</p>
                <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1.5 block">{currentProfile.role}</span>
              </div>
              <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center cursor-pointer shadow-sm hover:shadow-md transition-all group" onClick={() => navigate('/student/profile')}>
                <User className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
              </div>
              <button onClick={onLogout} className="text-slate-300 hover:text-rose-500 transition-colors ml-2">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="dashboard" element={<StudentHub profile={currentProfile} />} />
          <Route path="skills" element={<StudentSkills profile={currentProfile} />} />
          <Route path="profile" element={<UserProfilePage profile={currentProfile} />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function RecruiterLayout({ onLogout, profile }: { onLogout: () => void, profile: UserProfile }) {
  const [currentProfile, setCurrentProfile] = useState<UserProfile>(profile);
  const navigate = useNavigate();
  const location = useLocation();
  const subView = location.pathname.split('/').pop() || 'dashboard';

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 z-50 flex items-center justify-between glass px-10 py-6 border-b border-slate-200/50 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/recruiter/dashboard')}>
            <div className="h-11 w-11 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 group-hover:rotate-12 transition-all duration-500">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Crediskill</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-12">
          <nav className="hidden md:flex items-center gap-12">
            <button onClick={() => navigate('/recruiter/dashboard')} className={cn("text-[11px] font-black uppercase tracking-[0.25em] transition-all hover:text-indigo-600", subView === 'dashboard' ? "text-indigo-600" : "text-slate-400")}>Talent Pool</button>
            <button onClick={() => navigate('/recruiter/search')} className={cn("text-[11px] font-black uppercase tracking-[0.25em] transition-all hover:text-indigo-600", subView === 'search' ? "text-indigo-600" : "text-slate-400")}>Search</button>
            <button onClick={() => navigate('/recruiter/profile')} className={cn("text-[11px] font-black uppercase tracking-[0.25em] transition-all hover:text-indigo-600", subView === 'profile' ? "text-indigo-600" : "text-slate-400")}>Company Profile</button>
          </nav>

          <div className="flex items-center gap-6 pl-10 border-l border-slate-200">
            <div className="flex items-center gap-4 bg-white/50 px-5 py-2.5 rounded-[1.5rem] border border-slate-200 shadow-sm">
              <div className="text-right">
                <p className="text-xs font-black text-slate-900 leading-none">{currentProfile.displayName}</p>
                <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1.5 block">{currentProfile.role}</span>
              </div>
              <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center cursor-pointer shadow-sm hover:shadow-md transition-all group" onClick={() => navigate('/recruiter/profile')}>
                <User className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
              </div>
              <button onClick={onLogout} className="text-slate-300 hover:text-rose-500 transition-colors ml-2">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="dashboard" element={<RecruiterDashboard profile={currentProfile} />} />
          <Route path="search" element={<RecruiterSearch />} />
          <Route path="profile" element={<UserProfilePage profile={currentProfile} />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Landing({ onLogin }: { onLogin: (role: Role) => void }) {
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = (targetRole: Role) => {
    setIsLoggingIn(true);
    setTimeout(() => {
      onLogin(targetRole);
      navigate(targetRole === 'recruiter' ? '/recruiter' : '/student');
      setIsLoggingIn(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* Marquee */}
      <div className="marquee-container border-none bg-slate-900 text-white">
        <div className="marquee-content">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="mx-12 font-black tracking-[0.3em] text-[10px]">VERIFIED SKILLS ONLY • NO FLUFF • AI POWERED • PROOF OF WORK • </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-44px)]">
        {/* Left: Hero */}
        <div className="p-12 lg:p-24 flex flex-col justify-center bg-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full -z-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-50/50 blur-[100px] rounded-full" />
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-12"
          >
            <div className="h-16 w-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-200">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </motion.div>
          
          <h1 className="text-[clamp(3rem,8vw,6rem)] font-serif italic font-black leading-[0.85] tracking-tight mb-10 text-slate-900 text-balance">
            Show, <br />
            Don't <br />
            <span className="text-indigo-600 not-italic">Tell.</span>
          </h1>
          
          <p className="text-xl font-medium max-w-md mb-12 text-slate-500 leading-relaxed">
            The next-generation skill verification platform. Prove your expertise with real-time, AI-verified assessments that recruiters trust.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6">
            <Button 
              onClick={() => handleLogin('student')} 
              disabled={isLoggingIn}
              className="text-base px-12 py-5 bg-indigo-600 text-white flex-1 rounded-[1.5rem] shadow-2xl shadow-indigo-100 hover:shadow-indigo-200"
            >
              {isLoggingIn ? <Loader2 className="animate-spin" /> : "I'M A STUDENT"}
            </Button>
            <Button 
              onClick={() => handleLogin('recruiter')} 
              disabled={isLoggingIn}
              variant="secondary" 
              className="text-base px-12 py-5 flex-1 rounded-[1.5rem] border-slate-200 text-slate-700"
            >
              {isLoggingIn ? <Loader2 className="animate-spin" /> : "I'M A RECRUITER"}
            </Button>
          </div>
          <div className="mt-16 flex items-center gap-6">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 w-12 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                  <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Joined by 2,000+ experts</p>
          </div>
        </div>

        {/* Right: Features Grid */}
        <div className="bg-slate-50 p-12 lg:p-24 flex flex-col justify-center relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="modern-card group border-none">
              <div className="h-14 w-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-amber-500 transition-colors duration-500">
                <Code className="h-7 w-7 text-amber-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-xl font-serif italic font-black mb-4 text-slate-900">Code Integrity</h3>
              <p className="font-medium text-sm text-slate-500 leading-relaxed">Real-time anti-cheat challenges that verify you actually understand the code you write.</p>
            </Card>
            
            <Card className="modern-card group border-none">
              <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-emerald-500 transition-colors duration-500">
                <Zap className="h-7 w-7 text-emerald-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-xl font-serif italic font-black mb-4 text-slate-900">AI Evaluation</h3>
              <p className="font-medium text-sm text-slate-500 leading-relaxed">Instant, objective grading powered by Gemini 3. Get verified in minutes.</p>
            </Card>
            
            <Card className="modern-card group border-none">
              <div className="h-14 w-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-rose-500 transition-colors duration-500">
                <Award className="h-7 w-7 text-rose-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-xl font-serif italic font-black mb-4 text-slate-900">Proof of Work</h3>
              <p className="font-medium text-sm text-slate-500 leading-relaxed">Build a portfolio of verified badges that recruiters can trust implicitly.</p>
            </Card>
            
            <Card className="bg-slate-900 border-none shadow-[0_30px_60px_-15px_rgba(15,23,42,0.3)] p-10 rounded-[2.5rem] text-white group">
              <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-indigo-500 transition-colors duration-500">
                <Globe className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-serif italic font-black mb-4">Multimodal</h3>
              <p className="font-medium text-sm text-slate-400 leading-relaxed">Submit code, designs, or videos. Our AI analyzes visual and auditory quality.</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentSkills({ profile }: { profile: UserProfile }) {
  const [submissions] = useState<Submission[]>(MOCK_SUBMISSIONS);

  const pendingSkills = submissions.filter(s => s.status === 'pending');
  const verifiedSkills = profile.badges;

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <section>
        <div className="mb-10">
          <Badge color="bg-emerald-100 text-emerald-600 mb-4 px-4 py-1.5 text-xs">Verified Expertise</Badge>
          <h2 className="text-6xl font-black uppercase tracking-tighter text-gray-900">Verified Skills</h2>
          <p className="text-sm font-medium text-gray-400 mt-2 uppercase tracking-widest">Skills you've successfully proven through challenges</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {verifiedSkills.map(skill => (
            <Card key={skill} className="bg-white p-10 flex flex-col items-center text-center group border-emerald-100 hover:border-emerald-200 shadow-lg shadow-emerald-900/5">
              <div className="h-20 w-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Award className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-3xl font-black uppercase text-gray-900">{skill}</h3>
              <Badge color="bg-emerald-50 text-emerald-600 mt-6 px-4 py-1.5 border border-emerald-100">Verified Expert</Badge>
            </Card>
          ))}
          {verifiedSkills.length === 0 && (
            <div className="col-span-3 p-20 rounded-3xl border-2 border-dashed border-gray-100 text-center">
              <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Award className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-xl font-bold text-gray-300 uppercase tracking-tight">No verified skills yet. Start a challenge!</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-8">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900">Pending Verification</h2>
          <p className="text-sm font-medium text-gray-400 mt-2 uppercase tracking-widest">Challenges currently under AI review</p>
        </div>
        
        <div className="space-y-4">
          {pendingSkills.map(sub => (
            <Card key={sub.id} className="flex items-center justify-between p-6 bg-white border-gray-100 hover:border-amber-200 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="h-14 w-14 bg-amber-50 rounded-2xl flex items-center justify-center">
                  <Clock className="h-7 w-7 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase text-gray-900">{sub.taskTitle}</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {sub.type} • {new Date(sub.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge color="bg-amber-50 text-amber-600 border border-amber-100">Under Review</Badge>
            </Card>
          ))}
          {pendingSkills.length === 0 && (
            <div className="p-12 rounded-2xl bg-gray-50/50 border border-gray-100 text-center">
              <p className="font-bold uppercase tracking-widest text-gray-300">No pending verifications.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function UserProfilePage({ profile }: { profile: UserProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        ...formData,
        updatedAt: Timestamp.now()
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
        <div>
          <Badge color="bg-indigo-100 text-indigo-600 mb-4 px-4 py-1.5 text-xs">Profile Management</Badge>
          <h2 className="text-7xl font-black uppercase tracking-tighter leading-none text-gray-900">Profile</h2>
          <p className="font-medium text-gray-400 mt-4 uppercase tracking-widest">Manage your professional identity</p>
        </div>
        <Button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className="px-10 py-4 rounded-2xl shadow-xl shadow-indigo-200">
          {isEditing ? "SAVE CHANGES" : "EDIT PROFILE"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-1 space-y-8">
          <Card className="bg-white p-10 flex flex-col items-center text-center border-gray-100 shadow-xl shadow-indigo-900/5" hover={false}>
            <div className="h-40 w-40 rounded-3xl bg-indigo-50 flex items-center justify-center mb-8 shadow-inner">
              <User className="h-20 w-20 text-indigo-600" />
            </div>
            <h3 className="text-3xl font-black uppercase tracking-tight text-gray-900">{profile.displayName}</h3>
            <Badge color="bg-gray-100 text-gray-500 mt-3 px-4 py-1.5 uppercase tracking-widest text-[10px]">{profile.role}</Badge>
          </Card>

          <Card className="bg-indigo-600 text-white p-8 rounded-[2rem] shadow-xl shadow-indigo-200" hover={false}>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6 opacity-60">Quick Stats</h4>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="font-bold uppercase text-[10px] tracking-widest opacity-60">Verified Skills</span>
                <span className="text-2xl font-black">{profile.badges.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold uppercase text-[10px] tracking-widest opacity-60">Member Since</span>
                <span className="text-2xl font-black">{profile.joinedAt ? new Date(profile.joinedAt).getFullYear() : '2026'}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-8">
          <Card className="bg-white p-10 space-y-10 border-gray-100 shadow-xl shadow-indigo-900/5" hover={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Full Name</label>
                {isEditing ? (
                  <input 
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none font-bold uppercase transition-all" 
                    value={formData.displayName} 
                    onChange={e => setFormData({...formData, displayName: e.target.value})}
                  />
                ) : (
                  <p className="text-xl font-black uppercase text-gray-900">{profile.displayName}</p>
                )}
              </div>
              
              {profile.role === 'student' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">College / University</label>
                  {isEditing ? (
                    <input 
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none font-bold uppercase transition-all" 
                      value={formData.college || ''} 
                      onChange={e => setFormData({...formData, college: e.target.value})}
                    />
                  ) : (
                    <p className="text-xl font-black uppercase text-gray-900">{profile.college || 'Not specified'}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Company Name</label>
                  {isEditing ? (
                    <input 
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none font-bold uppercase transition-all" 
                      value={formData.companyName || ''} 
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                    />
                  ) : (
                    <p className="text-xl font-black uppercase text-gray-900">{profile.companyName || 'Not specified'}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Location</label>
                {isEditing ? (
                  <input 
                    className="modern-input w-full px-5 py-3 font-bold uppercase" 
                    value={formData.location || ''} 
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                ) : (
                  <p className="text-xl font-black uppercase text-slate-900">{profile.location || 'Remote'}</p>
                )}
              </div>

              {profile.role === 'recruiter' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Industry</label>
                  {isEditing ? (
                    <input 
                      className="modern-input w-full px-5 py-3 font-bold uppercase" 
                      value={formData.industry || ''} 
                      onChange={e => setFormData({...formData, industry: e.target.value})}
                    />
                  ) : (
                    <p className="text-xl font-black uppercase text-slate-900">{profile.industry || 'Not specified'}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Email</label>
                <p className="text-xl font-black uppercase text-slate-300">{profile.email}</p>
              </div>

              {profile.role === 'recruiter' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Website</label>
                  {isEditing ? (
                    <input 
                      className="modern-input w-full px-5 py-3 font-bold uppercase" 
                      value={formData.website || ''} 
                      onChange={e => setFormData({...formData, website: e.target.value})}
                    />
                  ) : (
                    <p className="text-xl font-black uppercase text-slate-900">{profile.website || 'Not specified'}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Bio</label>
              {isEditing ? (
                <textarea 
                  className="modern-input w-full px-5 py-4 font-bold uppercase h-32 resize-none" 
                  value={formData.bio || ''} 
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                />
              ) : (
                <p className="text-lg font-medium text-slate-600 leading-relaxed italic">"{profile.bio || 'No bio provided.'}"</p>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Languages</label>
              {isEditing ? (
                <input 
                  className="modern-input w-full px-5 py-3 font-bold uppercase" 
                  placeholder="e.g. English, Hindi, Spanish (comma separated)"
                  value={formData.languages?.join(', ') || ''} 
                  onChange={e => setFormData({...formData, languages: e.target.value.split(',').map(s => s.trim())})}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.languages?.map(l => <Badge key={l} color="bg-slate-50 text-slate-500 border border-slate-100">{l}</Badge>)}
                  {(!profile.languages || profile.languages.length === 0) && <p className="font-bold uppercase tracking-widest text-slate-300 text-xs">None specified</p>}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const DEMO_STUDENTS: UserProfile[] = [
  { uid: 'demo1', displayName: 'Aarav Sharma', college: 'IIT Bombay', badges: ['React', 'Node.js', 'UI Design'], bio: 'Passionate full-stack developer with a love for clean code.', location: 'Mumbai', languages: ['English', 'Hindi'], role: 'student', email: 'aarav@example.com' },
  { uid: 'demo2', displayName: 'Ishani Gupta', college: 'BITS Pilani', badges: ['Python', 'Machine Learning'], bio: 'Data science enthusiast focusing on NLP and computer vision.', location: 'Bangalore', languages: ['English', 'Bengali'], role: 'student', email: 'ishani@example.com' },
  { uid: 'demo3', displayName: 'Rohan Verma', college: 'Delhi Technological University', badges: ['Java', 'Android'], bio: 'Mobile app developer with 3 published apps on Play Store.', location: 'Delhi', languages: ['English', 'Punjabi'], role: 'student', email: 'rohan@example.com' },
  { uid: 'demo4', displayName: 'Ananya Iyer', college: 'NIT Trichy', badges: ['Figma', 'UI Design', 'UX Research'], bio: 'Product designer obsessed with user-centric experiences.', location: 'Chennai', languages: ['English', 'Tamil'], role: 'student', email: 'ananya@example.com' },
  { uid: 'demo5', displayName: 'Kabir Singh', college: 'SRM University', badges: ['C++', 'Algorithms'], bio: 'Competitive programmer and problem solver.', location: 'Hyderabad', languages: ['English', 'Telugu'], role: 'student', email: 'kabir@example.com' },
  { uid: 'demo6', displayName: 'Sanya Malhotra', college: 'Manipal Institute', badges: ['Marketing', 'SEO'], bio: 'Digital marketing specialist with a focus on growth hacking.', location: 'Pune', languages: ['English', 'Marathi'], role: 'student', email: 'sanya@example.com' },
  { uid: 'demo7', displayName: 'Vihaan Reddy', college: 'VIT Vellore', badges: ['Blockchain', 'Solidity'], bio: 'Web3 developer building the future of decentralized finance.', location: 'Bangalore', languages: ['English', 'Kannada'], role: 'student', email: 'vihaan@example.com' },
  { uid: 'demo8', displayName: 'Meera Kapoor', college: 'LSR Delhi', badges: ['Content Writing', 'Copywriting'], bio: 'Creative writer and storyteller for tech brands.', location: 'Gurgaon', languages: ['English', 'Hindi'], role: 'student', email: 'meera@example.com' },
];

function RecruiterDashboard({ profile }: { profile: UserProfile }) {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const s = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setStudents(s);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
  }, []);

  return (
    <div className="space-y-16 max-w-7xl mx-auto px-6 lg:px-10 py-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="max-w-2xl">
          <Badge color="bg-indigo-50 text-indigo-700 border-indigo-100 mb-6 px-6 py-2">Verified Talent Pool</Badge>
          <h2 className="text-[ clamp(3rem,6vw,5rem)] font-serif italic font-black tracking-tight leading-[0.9] text-slate-900">Talent Pool</h2>
          <p className="text-xl font-medium text-slate-500 mt-6 leading-relaxed">Discover verified experts for your team, vetted by our advanced AI analysis.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white border border-slate-100 rounded-[2rem] px-10 py-8 flex items-center gap-6 shadow-2xl shadow-slate-200/50">
            <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <span className="text-4xl font-black text-slate-900 block leading-none">{students.length}</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-2 block">Verified Talent</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {students.map(student => (
          <Card key={student.uid} className="modern-card group flex flex-col">
            <div className="flex justify-between items-start mb-10">
              <div className="h-20 w-20 rounded-[1.5rem] bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 transition-all duration-500 shadow-inner">
                <User className="h-10 w-10 text-indigo-600 group-hover:text-white transition-all duration-500" />
              </div>
              <div className="text-right">
                <Badge color="bg-slate-900 text-white border-slate-800">{student.badges?.length || 0} Badges</Badge>
              </div>
            </div>
            
            <h3 className="text-3xl font-serif italic font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">{student.displayName}</h3>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8">{student.college || 'Independent Student'}</p>
            
            <div className="flex flex-wrap gap-2.5 mb-10">
              {(student.badges || []).slice(0, 3).map(b => (
                <Badge key={b} color="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px]">{b}</Badge>
              ))}
              {(student.badges || []).length > 3 && <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] self-center ml-2">+{(student.badges || []).length - 3} MORE</span>}
            </div>

            <div className="mt-auto pt-8 border-t border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-500">
                <MapPin className="h-4 w-4" />
                <span className="text-[11px] font-black uppercase tracking-[0.15em]">{student.location || 'Remote'}</span>
              </div>
              <Button variant="secondary" className="px-8 py-3 text-[11px] rounded-[1.25rem] border-slate-200 text-slate-700 hover:border-indigo-600 hover:text-indigo-600" onClick={() => setSelectedStudent(student)}>VIEW PROFILE</Button>
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-[2.5rem] p-12 relative shadow-2xl border-none"
            >
              <button 
                onClick={() => setSelectedStudent(null)}
                className="absolute top-8 right-8 h-12 w-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all"
              >
                <Plus className="rotate-45 h-6 w-6" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                <div className="md:col-span-1 space-y-8">
                  <div className="h-56 w-56 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto shadow-inner">
                    <User className="h-24 w-24 text-slate-300" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-3xl font-black uppercase tracking-tight text-slate-900">{selectedStudent.displayName}</h3>
                    <Badge color="bg-emerald-50 text-emerald-600 mt-3 px-4 py-1.5 border border-emerald-100">Verified Talent</Badge>
                  </div>
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Verified Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudent.badges.map(b => <Badge key={b} color="bg-white text-indigo-600 border border-indigo-100 text-[10px]">{b}</Badge>)}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-10">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">College</label>
                      <p className="text-xl font-black uppercase text-slate-900">{selectedStudent.college || 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Location</label>
                      <p className="text-xl font-black uppercase text-slate-900">{selectedStudent.location || 'Remote'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Professional Bio</label>
                    <p className="text-lg font-medium text-slate-600 leading-relaxed italic">"{selectedStudent.bio || 'No bio provided.'}"</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Languages</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudent.languages?.map(l => <Badge key={l} color="bg-slate-100 text-slate-600">{l}</Badge>)}
                    </div>
                  </div>

                  <div className="pt-10 border-t border-slate-100">
                    <Button className="w-full text-xl py-5 rounded-2xl shadow-xl shadow-indigo-500/20">CONTACT STUDENT</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecruiterSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      let q = query(
        collection(db, 'users'),
        where('role', '==', 'student')
      );

      const snapshot = await getDocs(q);
      const allStudents = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];

      const filtered = allStudents.filter(s => {
        const matchesSearch = s.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (s.college && s.college.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesSkill = filterSkill === '' || (s.badges || []).includes(filterSkill);
        return matchesSearch && matchesSkill;
      });
      setResults(filtered);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
    setIsSearching(false);
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <section className="bg-slate-900 p-12 rounded-[2.5rem] border border-slate-800 shadow-2xl shadow-indigo-900/20 relative overflow-hidden">
        <div className="relative z-10">
          <Badge color="bg-indigo-500/10 text-indigo-400 mb-6 px-4 py-1.5 text-xs border border-indigo-500/20">Advanced Talent Search</Badge>
          <h2 className="text-6xl font-black uppercase tracking-tighter mb-10 text-white">Find Your Next Hire</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 block">Search by Name or College</label>
              <div className="relative group">
                <input 
                  type="text" 
                  className="modern-input w-full px-6 py-5 font-bold text-xl"
                  placeholder="Type name or college..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <Search className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 block">Filter by Skill</label>
              <div className="relative">
                <select 
                  className="modern-input w-full px-6 py-5 font-bold text-xl appearance-none"
                  value={filterSkill}
                  onChange={e => setFilterSkill(e.target.value)}
                >
                  <option value="">All Skills</option>
                  <option value="React">React</option>
                  <option value="Node.js">Node.js</option>
                  <option value="Python">Python</option>
                  <option value="UI Design">UI Design</option>
                  <option value="Machine Learning">Machine Learning</option>
                  <option value="Java">Java</option>
                  <option value="Algorithms">Algorithms</option>
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <ChevronDown className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
          <Button onClick={handleSearch} className="mt-10 px-12 py-5 text-xl rounded-2xl shadow-xl shadow-indigo-500/20">
            {isSearching ? <Loader2 className="animate-spin" /> : "FIND TALENT"}
          </Button>
        </div>
        <div className="absolute -right-20 -bottom-20 opacity-[0.05] rotate-12 pointer-events-none">
          <Search className="h-96 w-96 fill-indigo-500" />
        </div>
      </section>

      {results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {results.map(student => (
            <Card key={student.uid} className="group p-8 flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
                  <User className="h-8 w-8 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <div className="text-right">
                  <Badge color="bg-slate-100 text-slate-600">{student.badges?.length || 0} Badges</Badge>
                </div>
              </div>
              
              <h3 className="text-3xl font-black uppercase tracking-tight mb-1 text-slate-900 group-hover:text-indigo-600 transition-colors">{student.displayName}</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">{student.college || 'Independent Student'}</p>
              
              <div className="flex flex-wrap gap-2 mb-8">
                {(student.badges || []).slice(0, 3).map(b => (
                  <Badge key={b} color="bg-indigo-50 text-indigo-600 text-[10px]">{b}</Badge>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="h-3 w-3" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{student.location || 'Remote'}</span>
                </div>
                <Button variant="secondary" className="px-6 py-2.5 text-xs rounded-xl border-slate-200 hover:border-indigo-200 hover:text-indigo-600" onClick={() => setSelectedStudent(student)}>VIEW PROFILE</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-24 text-center rounded-[2.5rem] border-2 border-dashed border-slate-200">
          <div className="h-20 w-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Search className="h-10 w-10 text-slate-200" />
          </div>
          <p className="text-2xl font-black uppercase tracking-tight text-slate-300">
            {searchTerm || filterSkill ? "No matches found" : "Search results will appear here"}
          </p>
        </div>
      )}

      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-[2.5rem] p-12 relative shadow-2xl border-none"
            >
              <button 
                onClick={() => setSelectedStudent(null)}
                className="absolute top-8 right-8 h-12 w-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all"
              >
                <Plus className="rotate-45 h-6 w-6" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                <div className="md:col-span-1 space-y-8">
                  <div className="h-56 w-56 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto shadow-inner">
                    <User className="h-24 w-24 text-slate-300" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-3xl font-black uppercase tracking-tight text-slate-900">{selectedStudent.displayName}</h3>
                    <Badge color="bg-emerald-50 text-emerald-600 mt-3 px-4 py-1.5 border border-emerald-100">Verified Talent</Badge>
                  </div>
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Verified Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudent.badges?.map(b => <Badge key={b} color="bg-white text-indigo-600 border border-indigo-100 text-[10px]">{b}</Badge>)}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-10">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">College</label>
                      <p className="text-xl font-black uppercase text-slate-900">{selectedStudent.college || 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Location</label>
                      <p className="text-xl font-black uppercase text-slate-900">{selectedStudent.location || 'Remote'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Professional Bio</label>
                    <p className="text-lg font-medium text-slate-600 leading-relaxed italic">"{selectedStudent.bio || 'No bio provided.'}"</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Languages</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudent.languages?.map(l => <Badge key={l} color="bg-slate-100 text-slate-600">{l}</Badge>)}
                    </div>
                  </div>

                  <div className="pt-10 border-t border-slate-100">
                    <Button className="w-full text-xl py-5 rounded-2xl shadow-xl shadow-indigo-500/20">CONTACT STUDENT</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
function StudentHub({ profile }: { profile: UserProfile }) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [submissionType, setSubmissionType] = useState<'code' | 'image' | 'video'>('code');

  useEffect(() => {
    const q = query(
      collection(db, 'submissions'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const subs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Submission[];
      setSubmissions(subs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
    });
  }, [profile.uid]);

  const handleCustomGenerate = async () => {
    if (!customPrompt) return;
    setLoading(true);
    try {
      const taskData = await generateTask(customPrompt, 'intermediate', submissionType);
      
      const description = `
### Scenario
${taskData.scenario}

### Requirements
${taskData.requirements.map((req: string) => `- ${req}`).join('\n')}

### Submission Instructions
${taskData.submissionInstructions}
      `;

      setActiveTask({
        ...taskData,
        id: 'custom-' + Date.now(),
        description,
        difficulty: 'intermediate',
        submissionType: submissionType,
        type: submissionType
      });
    } catch (error) {
      console.error("Error generating task:", error);
    }
    setLoading(false);
  };

  const SUGGESTED_PROMPTS = [
    { label: "Design a Brand Identity", type: "image", prompt: "Create a minimalist brand identity for a sustainable coffee shop." },
    { label: "Animate a Logo", type: "video", prompt: "Create a 5-second logo animation for a tech startup." },
    { label: "React Dashboard", type: "code", prompt: "Build a responsive analytics dashboard using React and Tailwind." },
    { label: "Character Art", type: "image", prompt: "Design a cyberpunk character with neon elements." },
  ];

  if (activeTask) {
    return <TaskInterface task={activeTask} onCancel={() => setActiveTask(null)} profile={profile} />;
  }

  return (
    <div className="space-y-16 max-w-7xl mx-auto px-6 lg:px-10 py-16">
      <section className="bg-slate-900 p-16 rounded-[3rem] shadow-2xl shadow-indigo-200/20 relative overflow-hidden">
        <div className="relative z-10">
          <Badge color="bg-indigo-500 text-white border-indigo-400 mb-8 px-6 py-2">AI-Powered Verification</Badge>
          <h2 className="text-[clamp(3rem,6vw,5rem)] font-serif italic font-black tracking-tight leading-[0.9] text-white mb-6">Get Verified</h2>
          <p className="text-xl font-medium text-slate-400 mb-12 max-w-2xl leading-relaxed">
            Enter a skill or project idea. Our AI will generate a unique challenge to prove your expertise in real-time.
          </p>
          
          <div className="flex flex-col gap-10">
            <div className="flex flex-wrap gap-4">
              {(['code', 'image', 'video'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSubmissionType(type)}
                  className={cn(
                    "px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all border-2",
                    submissionType === type 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xl shadow-indigo-500/30 -translate-y-1" 
                      : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white"
                  )}
                >
                  {type === 'code' && <Code className="inline-block mr-3 h-5 w-5" />}
                  {type === 'image' && <ImageIcon className="inline-block mr-3 h-5 w-5" />}
                  {type === 'video' && <Video className="inline-block mr-3 h-5 w-5" />}
                  {type}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <input 
                type="text" 
                placeholder={submissionType === 'code' ? "e.g. React Dashboard with Tailwind" : "e.g. Minimalist Logo Design"}
                className="flex-1 px-8 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] focus:bg-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-black text-2xl text-white placeholder:text-slate-600 transition-all"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
              <Button onClick={handleCustomGenerate} disabled={loading} className="px-16 py-5 text-xl rounded-[1.5rem] shadow-2xl shadow-indigo-500/20">
                {loading ? <Loader2 className="animate-spin" /> : "START CHALLENGE"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 w-full mb-2">Suggested Challenges:</span>
              {SUGGESTED_PROMPTS.map((suggested, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCustomPrompt(suggested.prompt);
                    setSubmissionType(suggested.type as any);
                  }}
                  className="text-[10px] font-black uppercase tracking-[0.15em] px-6 py-3 rounded-full border border-white/10 bg-white/5 text-slate-400 hover:border-indigo-500 hover:text-white hover:bg-white/10 transition-all"
                >
                  {suggested.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 opacity-10 rotate-12 pointer-events-none">
          <Shield className="h-[30rem] w-[30rem] fill-indigo-500" />
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-serif italic font-black tracking-tight leading-[0.9] text-slate-900">History</h2>
            <p className="text-lg font-medium text-slate-500 mt-4 leading-relaxed">Your past verifications and performance metrics.</p>
          </div>
          <Badge color="bg-slate-900 text-white border-slate-800 px-6 py-2">{submissions.length} Submissions</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {submissions.map(sub => (
            <Card key={sub.id} className="modern-card group">
              <div className="flex justify-between items-start mb-8">
                <h4 className="text-2xl font-serif italic font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">{sub.taskTitle}</h4>
                <span className="text-3xl font-black text-indigo-600">{sub.score}%</span>
              </div>
              <div className="flex items-center gap-4 mb-8">
                <Badge color={sub.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}>{sub.status}</Badge>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  {sub.timestamp instanceof Date ? sub.timestamp.toLocaleDateString() : 'Recent'}
                </span>
              </div>
              <p className="text-base font-medium text-slate-500 line-clamp-2 mb-10 leading-relaxed italic border-l-2 border-slate-100 pl-4">"{sub.feedback[0]}"</p>
              <Button variant="secondary" className="w-full text-[11px] py-4 rounded-[1.25rem] border-slate-200 text-slate-700 hover:border-indigo-600 hover:text-indigo-600">VIEW DETAILS</Button>
            </Card>
          ))}
          {submissions.length === 0 && (
            <div className="col-span-3 p-20 rounded-3xl border-2 border-dashed border-slate-100 text-center">
              <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Award className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-xl font-bold text-slate-300 uppercase tracking-tight">No history yet. Complete your first challenge!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function TaskInterface({ task, onCancel, profile }: { task: Task, onCancel: () => void, profile: UserProfile }) {
  const [code, setCode] = useState('');
  const [mediaData, setMediaData] = useState<{ base64: string, mimeType: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAntiCheat, setShowAntiCheat] = useState(false);
  const [antiCheatQuestion, setAntiCheatQuestion] = useState<{ question: string, options: string[], correctIndex: number } | null>(null);
  const [antiCheatScore, setAntiCheatScore] = useState(100);
  const [timeLeft, setTimeLeft] = useState(15);
  const hasAskedAntiCheat = useRef(false);

  const triggerAntiCheat = async () => {
    if (hasAskedAntiCheat.current) return;
    hasAskedAntiCheat.current = true;
    try {
      const question = await generateAntiCheat(task.title, code);
      setAntiCheatQuestion(question);
      setShowAntiCheat(true);
      setTimeLeft(15);
    } catch (error) {
      console.error("Anti-cheat error:", error);
    }
  };

  useEffect(() => {
    let timer: any;
    if (showAntiCheat && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (showAntiCheat && timeLeft === 0) {
      handleAntiCheatAnswer(-1); // Time's up
    }
    return () => clearInterval(timer);
  }, [showAntiCheat, timeLeft]);

  const handleAntiCheatAnswer = (index: number) => {
    if (index !== antiCheatQuestion?.correctIndex) {
      setAntiCheatScore(prev => Math.max(0, prev - 30));
    }
    setShowAntiCheat(false);
    setAntiCheatQuestion(null);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const evaluation = await evaluateSubmission(task, code || mediaData?.base64 || '', task.submissionType, mediaData?.mimeType);
      
      const finalScore = Math.round((evaluation.score * 0.7) + (antiCheatScore * 0.3));
      const status = finalScore >= 70 ? 'verified' : 'failed';

      // Truncate content for Firestore if it's too large (demo mode)
      let storedContent = code || mediaData?.base64 || '';
      if (storedContent.length > 500000) { // Approx 500KB limit for demo
        storedContent = "[Media Content Truncated for Demo - Original evaluated by AI]";
      }

      const submissionData: Submission = {
        userId: profile.uid,
        taskId: task.id || 'custom',
        taskTitle: task.title,
        type: task.submissionType,
        content: storedContent,
        status: status as any,
        score: finalScore,
        feedback: evaluation.feedback,
        reasoning: evaluation.reasoning,
        timestamp: Timestamp.now()
      };

      await addDoc(collection(db, 'submissions'), submissionData);
      
      if (status === 'verified') {
        // Update user badges if not already present
        if (!profile.badges.includes(task.title)) {
          const userRef = doc(db, 'users', profile.uid);
          await updateDoc(userRef, {
            badges: [...profile.badges, task.title]
          });
        }
      }

      onCancel();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'submissions');
    }
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (task.submissionType === 'code' && code.length > 200 && Math.random() > 0.8) {
      triggerAntiCheat();
    }
  }, [code]);

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-indigo-600">
            <Plus className="rotate-45 h-6 w-6" />
          </button>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter leading-none text-slate-900">{task.title}</h3>
            <div className="flex items-center gap-3 mt-1">
              <Badge color="bg-indigo-50 text-indigo-600">{task.difficulty}</Badge>
              <Badge color="bg-slate-50 text-slate-500 border border-slate-100">
                {task.submissionType === 'code' && <Code className="h-3 w-3 mr-1 inline" />}
                {task.submissionType === 'image' && <ImageIcon className="h-3 w-3 mr-1 inline" />}
                {task.submissionType === 'video' && <Video className="h-3 w-3 mr-1 inline" />}
                {task.submissionType}
              </Badge>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Time Limit: 45:00</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={onCancel} className="px-6 rounded-xl border-slate-200">CANCEL</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="px-8 rounded-xl shadow-lg shadow-indigo-500/20">
            {isSubmitting ? <Loader2 className="animate-spin" /> : "SUBMIT VERIFICATION"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Instructions */}
        <div className="w-1/3 border-r border-slate-100 p-12 overflow-y-auto bg-slate-50/50">
          <div className="mb-8">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 mb-2">Challenge Details</h4>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-indigo-600" />
              Mission Brief
            </h2>
          </div>
          
          <div className="prose prose-indigo max-w-none font-medium text-slate-600 leading-relaxed">
            <Markdown>{task.description}</Markdown>
          </div>
          
          <div className="mt-12 p-8 rounded-3xl bg-amber-50 border border-amber-100 relative overflow-hidden group">
            <div className="relative z-10">
              <h5 className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Pro Tip
              </h5>
              <p className="text-sm font-medium text-amber-900/70 leading-relaxed">
                {task.submissionType === 'code' 
                  ? "Our AI checks for code quality, accessibility, and security. Don't just make it work, make it great."
                  : task.submissionType === 'image'
                  ? "Our AI evaluates composition, color theory, and adherence to the brief. High resolution matters."
                  : "Our AI analyzes pacing, clarity, and technical execution. Ensure good lighting and clear audio."}
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
              <Award className="h-24 w-24 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Right: Editor/Upload */}
        <div className="flex-1 flex flex-col bg-[#0d1117]">
          <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
              <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
              <span className="ml-4 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                {task.submissionType === 'code' ? 'index.tsx' : 'media_upload.bin'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest animate-pulse">● Live Editor</span>
            </div>
          </div>
          
          <div className="flex-1 relative overflow-hidden">
            {task.submissionType === 'code' ? (
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full bg-transparent text-indigo-300 font-mono p-12 resize-none outline-none text-lg leading-relaxed selection:bg-indigo-500/30"
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
                  className="absolute inset-0 z-50 flex items-center justify-center p-12 bg-slate-900/80 backdrop-blur-md"
                >
                  <Card className="max-w-xl w-full bg-white p-12 rounded-[2rem] shadow-2xl border-none">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4 text-rose-600">
                        <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center">
                          <AlertCircle className="h-10 w-10" />
                        </div>
                        <div>
                          <h4 className="text-3xl font-black uppercase tracking-tighter leading-none">Integrity Check</h4>
                          <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-wide">Prove your expertise</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Time Remaining</span>
                        <span className={cn("text-3xl font-black font-mono", timeLeft < 5 ? "text-rose-600 animate-pulse" : "text-slate-900")}>
                          {timeLeft}s
                        </span>
                      </div>
                    </div>
                    <p className="text-2xl font-black uppercase mb-10 leading-tight text-slate-900">{antiCheatQuestion.question}</p>
                    <div className="grid grid-cols-1 gap-4">
                      {antiCheatQuestion.options?.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleAntiCheatAnswer(i)}
                          className="w-full text-left p-6 rounded-2xl border border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 font-bold uppercase transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <span className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-black group-hover:bg-indigo-600 group-hover:text-white transition-colors">{String.fromCharCode(65 + i)}</span>
                            <span className="text-slate-600 group-hover:text-indigo-900">{opt}</span>
                          </div>
                        </button>
                      ))}
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

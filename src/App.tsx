import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  Gamepad2, 
  Plus, 
  LogOut, 
  ArrowRight, 
  Sparkles, 
  Timer, 
  CheckCircle2, 
  XCircle,
  Play,
  User as UserIcon,
  Search,
  MessageSquare,
  Zap,
  Star,
  Crown,
  Volume2,
  Skull,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db 
} from './firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  useParams
} from 'react-router-dom';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy,
  Timestamp,
  arrayUnion,
  deleteDoc,
  limit
} from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { generateQuiz, generateGameIntro } from './services/gemini';

// --- Types ---

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  totalScore: number;
  gamesPlayed: number;
  wins: number;
  xp: number;
  level: number;
  achievements: string[];
}

interface Question {
  text: string;
  options?: string[];
  answer: string;
  explanation: string;
}

interface Player {
  uid: string;
  displayName: string;
  score: number;
  lastAnswer: string;
  isReady: boolean;
  streak: number;
  powerups: {
    fiftyFiftyUsed: boolean;
    doublePointsUsed: boolean;
  };
}

interface Room {
  id: string;
  hostId: string;
  hostName: string;
  theme: string;
  gameType: 'quiz' | 'guessing' | 'competition';
  status: 'waiting' | 'playing' | 'finished';
  currentQuestionIndex: number;
  questions: Question[];
  players: Player[];
  intro?: string;
  isKidFriendly: boolean;
  password?: string;
  createdAt: any;
}

// --- Components ---

function Marquee() {
  return (
    <div className="marquee-track">
      {[...Array(10)].map((_, i) => (
        <span key={i} className="mx-8">
          QUIZWHIZ AI • HOST ANY GAME • AI GENERATED FUN • ADULT RATED • CHILD FRIENDLY • EDUCATIONAL • UNHINGED HOST • 
        </span>
      ))}
    </div>
  );
}

function Button({ children, onClick, variant = "secondary", className, disabled, type = "button" }: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: "primary" | "secondary" | "danger", 
  className?: string,
  disabled?: boolean,
  type?: "button" | "submit"
}) {
  const variants = {
    primary: "brutal-btn-primary",
    secondary: "bg-white",
    danger: "bg-red-500 text-white"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`brutal-btn ${variants[variant]} ${className} disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        getDoc(userRef).then((snap) => {
          if (!snap.exists()) {
            setDoc(userRef, {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
              totalScore: 0,
              gamesPlayed: 0,
              wins: 0,
              xp: 0,
              level: 1,
              achievements: []
            });
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="h-16 w-16 text-[#00FF00]" />
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans selection:bg-[#00FF00] selection:text-black">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/" />} />
          <Route path="/create" element={user ? <CreateRoom user={user} /> : <Navigate to="/" />} />
          <Route path="/room/:id" element={user ? <GameRoom user={user} /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

function Landing() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Marquee />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        <div className="p-12 lg:p-24 flex flex-col justify-center bg-white relative">
          <div className="absolute top-12 left-12 opacity-20 hidden lg:block">
            <Star className="h-24 w-24 animate-pulse" />
          </div>
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 12 }}
          >
            <h1 className="font-display text-[clamp(4rem,12vw,10rem)] leading-[0.75] mb-8 tracking-tighter">
              QUIZ<br />WHIZ<br /><span className="text-[#00FF00] drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">AI</span>
            </h1>
            <p className="text-2xl font-black mb-12 max-w-md border-l-8 border-[#00FF00] pl-6 py-2">
              THE CHAOTIC AI GAME SHOW HOST. CREATE UNHINGED CHALLENGES FOR ANY THEME IN SECONDS.
            </p>
            <Button onClick={handleLogin} variant="primary" className="text-3xl py-6 px-12 group">
              JOIN THE CHAOS <ArrowRight className="inline ml-4 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </div>
        <div className="bg-[#00FF00] border-l-4 border-black p-12 lg:p-24 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <Zap key={i} className="absolute animate-bounce" style={{ 
                top: `${Math.random() * 100}%`, 
                left: `${Math.random() * 100}%`,
                transform: `rotate(${Math.random() * 360}deg)`,
                animationDelay: `${Math.random() * 2}s`
              }} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-8 relative z-10">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 2 }}
              className="brutal-card bg-white max-w-sm rotate-3"
            >
              <div className="big-number mb-4 text-[#00FF00] drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">01</div>
              <h3 className="text-4xl font-display mb-4">UNHINGED AI</h3>
              <p className="font-black uppercase text-sm">Our AI host has no filter and a lot of coffee. Expect the unexpected.</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05, rotate: -2 }}
              className="brutal-card bg-white max-w-sm -rotate-3 lg:ml-12"
            >
              <div className="big-number mb-4 text-[#00FF00] drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">02</div>
              <h3 className="text-4xl font-display mb-4">ANY VIBE</h3>
              <p className="font-black uppercase text-sm">From "90s Anime" to "Drunk Philosophy". If you can think it, AI can host it.</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Leaderboard() {
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('totalScore', 'desc'),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setTopUsers(snap.docs.map(d => d.data() as UserProfile));
    });
    return unsubscribe;
  }, []);

  return (
    <div className="brutal-card bg-white p-8">
      <h3 className="font-display text-4xl mb-6 uppercase border-b-4 border-black pb-2 flex items-center gap-4">
        <Trophy className="text-[#00FF00]" /> Hall of Chaos
      </h3>
      <div className="space-y-4">
        {topUsers.map((u, i) => (
          <div key={u.uid} className={`flex justify-between items-center p-4 border-2 border-black ${i === 0 ? 'bg-[#00FF00]/10' : ''}`}>
            <div className="flex items-center gap-4">
              <span className="font-display text-2xl">#{i + 1}</span>
              <img src={u.photoURL} alt="" className="h-10 w-10 border-2 border-black" />
              <div className="flex flex-col">
                <span className="font-black uppercase text-sm">{u.displayName}</span>
                <span className="text-[10px] font-bold opacity-40">LVL {u.level}</span>
              </div>
            </div>
            <span className="font-display text-xl">{u.totalScore}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chat({ roomId, user }: { roomId: string, user: User }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => d.data()));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return unsubscribe;
  }, [roomId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = newMessage;
    setNewMessage('');
    await addDoc(collection(db, 'rooms', roomId, 'messages'), {
      uid: user.uid,
      displayName: user.displayName,
      text: msg,
      createdAt: Timestamp.now()
    });
  };

  return (
    <div className="brutal-card bg-white flex flex-col h-[400px]">
      <div className="p-4 border-b-4 border-black bg-black text-white flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <span className="font-black uppercase text-sm">Chaos Chat</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.uid === user.uid ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] font-bold opacity-40 uppercase mb-1">{m.displayName}</span>
            <div className={`p-3 border-2 border-black font-black text-sm ${m.uid === user.uid ? 'bg-[#00FF00]/20' : 'bg-gray-100'}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <form onSubmit={sendMessage} className="p-4 border-t-4 border-black flex gap-2">
        <input 
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="TYPE..."
          className="brutal-input flex-1 py-2 text-sm"
        />
        <Button type="submit" className="px-4 py-2">SEND</Button>
      </form>
    </div>
  );
}

function Dashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'rooms'), 
      where('status', '==', 'waiting'), 
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));
    });

    const userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    });

    return () => {
      unsubscribe();
      userUnsubscribe();
    };
  }, [user.uid]);

  const handleJoinRoom = (room: Room) => {
    if (room.hostId === user.uid) {
      navigate(`/room/${room.id}`);
      return;
    }
    
    if (room.password) {
      const pass = prompt("ENTER ROOM PASSWORD:");
      if (pass !== room.password) {
        alert("WRONG PASSWORD! NO CHAOS FOR YOU.");
        return;
      }
    }
    navigate(`/room/${room.id}`);
  };

  return (
    <div className="flex-1 bg-white p-8 lg:p-16">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 border-b-8 border-black pb-12">
        <div>
          <h2 className="font-display text-8xl uppercase leading-none mb-2">Lobby</h2>
          <p className="font-black uppercase tracking-widest text-[#B19CD9] bg-black px-4 py-1 inline-block">
            {rooms.length} Games Active
          </p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <Button onClick={() => navigate('/create')} variant="primary" className="flex-1 md:flex-none text-xl bg-[#FFB7C5]">
            <Plus className="inline mr-2" /> CREATE ROOM
          </Button>
          <Button onClick={() => signOut(auth)} className="flex-1 md:flex-none">
            <LogOut className="inline mr-2" /> EXIT
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* User Stats */}
          {profile && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="brutal-card bg-[#FFB7C5]/20 p-6">
                <p className="text-xs font-black uppercase opacity-40 mb-2">Total Score</p>
                <p className="font-display text-4xl">{profile.totalScore}</p>
              </div>
              <div className="brutal-card bg-[#B19CD9]/20 p-6">
                <p className="text-xs font-black uppercase opacity-40 mb-2">Games Played</p>
                <p className="font-display text-4xl">{profile.gamesPlayed}</p>
              </div>
              <div className="brutal-card bg-[#00FF00]/10 p-6">
                <p className="text-xs font-black uppercase opacity-40 mb-2">Wins</p>
                <p className="font-display text-4xl">{profile.wins}</p>
              </div>
              <div className="brutal-card bg-black text-white p-6">
                <p className="text-xs font-black uppercase opacity-40 mb-2">Level</p>
                <p className="font-display text-4xl">{profile.level}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {rooms.map(room => (
              <motion.div 
                key={room.id} 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`brutal-card group relative overflow-hidden ${room.isKidFriendly ? 'border-[#FFB7C5]' : ''}`}
              >
                <div className={`absolute top-0 right-0 px-4 py-2 font-display text-xl -rotate-2 translate-x-2 -translate-y-2 ${room.isKidFriendly ? 'bg-[#FFB7C5] text-black' : 'bg-black text-[#00FF00]'}`}>
                  {room.gameType}
                </div>
                <div className="flex justify-between items-start mb-8">
                  <div className={`flex items-center gap-2 font-black px-3 py-1 border-2 border-black ${room.isKidFriendly ? 'bg-[#FFB7C5]' : 'bg-[#00FF00]'}`}>
                    <Users className="h-5 w-5" /> {room.players.length} PLAYERS
                  </div>
                  <div className="flex gap-2">
                    {room.password && (
                      <div className="bg-black text-white p-1 border-2 border-black">
                        <Lock className="h-4 w-4" />
                      </div>
                    )}
                    {room.isKidFriendly && (
                      <div className="flex items-center gap-1 font-black bg-[#B19CD9] px-3 py-1 border-2 border-black text-xs">
                        <Star className="h-3 w-3 fill-black" /> KIDS
                      </div>
                    )}
                  </div>
                </div>
                <h3 className={`text-4xl font-display mb-4 uppercase leading-none transition-colors ${room.isKidFriendly ? 'group-hover:text-[#FFB7C5]' : 'group-hover:text-[#00FF00]'}`}>
                  {room.theme}
                </h3>
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-10 w-10 bg-black flex items-center justify-center">
                    <UserIcon className="text-white h-6 w-6" />
                  </div>
                  <p className="font-black uppercase text-xs tracking-tighter">Hosted by {room.hostName}</p>
                </div>
                <Button 
                  onClick={() => handleJoinRoom(room)} 
                  variant="primary" 
                  className={`w-full text-xl group ${room.isKidFriendly ? 'bg-[#B19CD9]' : ''}`}
                >
                  {room.isKidFriendly ? 'JOIN THE FUN' : 'JOIN THE CHAOS'} <ArrowRight className="inline ml-2 group-hover:translate-x-2 transition-transform" />
                </Button>
              </motion.div>
            ))}
            {rooms.length === 0 && (
              <div className="col-span-full py-32 text-center border-8 border-dashed border-black/10">
                <Skull className="h-24 w-24 mx-auto mb-8 opacity-10" />
                <p className="text-6xl font-display uppercase opacity-10">Ghost Town</p>
                <p className="font-black uppercase tracking-widest mt-4 opacity-20">No active games. Be the first to start the chaos!</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-12">
          <Leaderboard />
          <div className="brutal-card bg-black text-white p-8">
            <h3 className="font-display text-4xl mb-4 uppercase">Why QuizWhiz?</h3>
            <p className="font-black uppercase text-sm leading-relaxed">
              Because standard trivia is boring. We use Gemini AI to turn any topic into a high-stakes, chaotic game show. 
              No filters. No mercy. Just pure AI-generated madness.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateRoom({ user }: { user: User }) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState('');
  const [gameType, setGameType] = useState<'quiz' | 'guessing' | 'competition'>('quiz');
  const [isKidFriendly, setIsKidFriendly] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme) return;
    setLoading(true);

    try {
      const questions = await generateQuiz(theme, gameType, isKidFriendly);
      const intro = await generateGameIntro(theme, gameType, isKidFriendly);
      
      const roomRef = doc(collection(db, 'rooms'));
      const newRoom: Room = {
        id: roomRef.id,
        hostId: user.uid,
        hostName: user.displayName || 'Anonymous',
        theme,
        gameType,
        status: 'waiting',
        currentQuestionIndex: 0,
        questions,
        players: [{
          uid: user.uid,
          displayName: user.displayName || 'Host',
          score: 0,
          lastAnswer: '',
          isReady: true,
          streak: 0,
          powerups: {
            fiftyFiftyUsed: false,
            doublePointsUsed: false
          }
        }],
        intro,
        isKidFriendly,
        password: password || undefined,
        createdAt: Timestamp.now()
      };

      await setDoc(roomRef, newRoom);
      navigate(`/room/${roomRef.id}`);
    } catch (error) {
      console.error("Failed to create room", error);
      alert("AI was too busy having fun. Try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#FFB7C5] p-8 lg:p-24 flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="absolute font-display text-[20rem] leading-none select-none" style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            transform: `rotate(${Math.random() * 360}deg)`
          }}>?</div>
        ))}
      </div>
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="brutal-card bg-white max-w-3xl w-full relative z-10"
      >
        <h2 className="font-display text-8xl mb-12 uppercase leading-none tracking-tighter">Setup<br />Game</h2>
        <form onSubmit={handleCreate} className="space-y-12">
          <div className="space-y-4">
            <label className="block font-black uppercase tracking-[0.2em] text-xl">The Theme</label>
            <input 
              className="brutal-input text-2xl py-6"
              placeholder="e.g. 90s Cartoons, Space Facts, Dinosaurs..."
              value={theme}
              onChange={e => setTheme(e.target.value)}
              required
            />
            <p className="text-xs font-bold uppercase opacity-40 italic">Be specific. Be weird. Be unhinged.</p>
          </div>
          <div className="space-y-4">
            <label className="block font-black uppercase tracking-[0.2em] text-xl">Game Type</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['quiz', 'guessing', 'competition'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setGameType(type)}
                  className={`brutal-btn text-xl group relative overflow-hidden ${gameType === type ? 'bg-[#B19CD9]' : ''}`}
                >
                  <span className="relative z-10">{type}</span>
                  {gameType === type && <motion.div layoutId="activeType" className="absolute inset-0 bg-[#B19CD9]" />}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-4 cursor-pointer group">
              <div 
                onClick={() => setIsKidFriendly(!isKidFriendly)}
                className={`h-10 w-20 border-[6px] border-black rounded-full relative transition-colors ${isKidFriendly ? 'bg-[#00FF00]' : 'bg-white'}`}
              >
                <motion.div 
                  animate={{ x: isKidFriendly ? 40 : 0 }}
                  className="h-6 w-6 bg-black rounded-full absolute top-1 left-1"
                />
              </div>
              <span className="font-black uppercase tracking-[0.2em] text-xl">Kid Friendly Mode</span>
            </label>
            <p className="text-xs font-bold uppercase opacity-40 italic">Enables magical, friendly AI host and safe content.</p>
          </div>
          <div className="space-y-4">
            <label className="block font-black uppercase tracking-[0.2em] text-xl">Room Password (Optional)</label>
            <input 
              type="password"
              className="brutal-input text-2xl py-6"
              placeholder="Leave blank for public room..."
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <p className="text-xs font-bold uppercase opacity-40 italic">Keep the chaos exclusive.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-6 pt-8">
            <Button type="submit" variant="primary" className="flex-[2] text-3xl py-8" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-4">
                  <Sparkles className="animate-spin" /> GENERATING...
                </span>
              ) : "GENERATE CHAOS"}
            </Button>
            <Button onClick={() => navigate('/dashboard')} className="flex-1 text-xl">CANCEL</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function GameRoom({ user }: { user: User }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [activePowerups, setActivePowerups] = useState({
    doublePoints: false,
    fiftyFifty: false
  });

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'rooms', id), (snap) => {
      if (!snap.exists()) {
        navigate('/dashboard');
        return;
      }
      const data = snap.data() as Room;
      setRoom(data);

      // Reset submission state when question changes
      if (data.status === 'playing') {
        const myPlayer = data.players.find(p => p.uid === user.uid);
        if (!myPlayer?.lastAnswer) {
          setSubmitted(false);
          setAnswer('');
          setShowExplanation(false);
          setActivePowerups({ doublePoints: false, fiftyFifty: false });
        } else {
          setSubmitted(true);
          setAnswer(myPlayer.lastAnswer);
          setShowExplanation(true);
        }
      }
    });
    return unsubscribe;
  }, [id, user.uid]);

  useEffect(() => {
    if (!room || room.status !== 'finished') return;
    
    const updateStats = async () => {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;

      const userData = userSnap.data() as UserProfile;
      const myPlayer = room.players.find(p => p.uid === user.uid);
      if (!myPlayer) return;

      // Check if we already updated for this room (simple local storage check or similar could work, 
      // but for now we'll just do it. In production, we'd use a more robust way to prevent double counting)
      const isWinner = room.players.sort((a, b) => b.score - a.score)[0]?.uid === user.uid;
      
      const newAchievements = [...(userData.achievements || [])];
      if (isWinner && !newAchievements.includes('First Win')) newAchievements.push('First Win');
      if (myPlayer.streak >= 5 && !newAchievements.includes('Streak Master')) newAchievements.push('Streak Master');
      if (userData.gamesPlayed + 1 >= 10 && !newAchievements.includes('Chaos Veteran')) newAchievements.push('Chaos Veteran');

      await updateDoc(userRef, {
        totalScore: userData.totalScore + myPlayer.score,
        gamesPlayed: userData.gamesPlayed + 1,
        wins: isWinner ? userData.wins + 1 : userData.wins,
        xp: userData.xp + (myPlayer.score * 10),
        level: Math.floor((userData.xp + (myPlayer.score * 10)) / 1000) + 1,
        achievements: newAchievements
      });
    };

    updateStats();
  }, [room?.status, user.uid]);

  const handleJoin = async () => {
    if (!room || room.players.find(p => p.uid === user.uid)) return;
    const newPlayer: Player = {
      uid: user.uid,
      displayName: user.displayName || 'Player',
      score: 0,
      lastAnswer: '',
      isReady: false,
      streak: 0,
      powerups: {
        fiftyFiftyUsed: false,
        doublePointsUsed: false
      }
    };
    await updateDoc(doc(db, 'rooms', room.id), {
      players: arrayUnion(newPlayer)
    });
  };

  const handleReady = async () => {
    if (!room) return;
    const updatedPlayers = room.players.map(p => 
      p.uid === user.uid ? { ...p, isReady: !p.isReady } : p
    );
    await updateDoc(doc(db, 'rooms', room.id), { players: updatedPlayers });
  };

  const handleStart = async () => {
    if (!room) return;
    await updateDoc(doc(db, 'rooms', room.id), { status: 'playing' });
  };

  const handleSubmitAnswer = async (selectedAnswer: string) => {
    if (!room || submitted) return;
    setSubmitted(true);
    setAnswer(selectedAnswer);

    const currentQuestion = room.questions[room.currentQuestionIndex];
    let isCorrect = false;

    if (room.gameType === 'quiz') {
      isCorrect = selectedAnswer === currentQuestion.answer;
    } else {
      // For guessing/competition, we do a simple fuzzy match or host can decide (simplified here)
      isCorrect = selectedAnswer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim();
    }
    
    const updatedPlayers = room.players.map(p => {
      if (p.uid === user.uid) {
        const newStreak = isCorrect ? p.streak + 1 : 0;
        const streakBonus = newStreak >= 3 ? 5 : 0;
        const basePoints = isCorrect ? 10 : 0;
        const multiplier = activePowerups.doublePoints ? 2 : 1;
        
        return { 
          ...p, 
          score: p.score + ((basePoints + streakBonus) * multiplier),
          lastAnswer: selectedAnswer,
          streak: newStreak,
          powerups: {
            fiftyFiftyUsed: p.powerups.fiftyFiftyUsed || activePowerups.fiftyFifty,
            doublePointsUsed: p.powerups.doublePointsUsed || activePowerups.doublePoints
          }
        };
      }
      return p;
    });

    await updateDoc(doc(db, 'rooms', room.id), { players: updatedPlayers });

    // Check if everyone has answered
    const allAnswered = updatedPlayers.every(p => p.lastAnswer !== '');
    if (allAnswered) {
      setShowExplanation(true);
      setTimeout(async () => {
        if (room.currentQuestionIndex < room.questions.length - 1) {
          await updateDoc(doc(db, 'rooms', room.id), {
            currentQuestionIndex: room.currentQuestionIndex + 1,
            players: updatedPlayers.map(p => ({ ...p, lastAnswer: '' }))
          });
        } else {
          await updateDoc(doc(db, 'rooms', room.id), { status: 'finished' });
          confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#00FF00', '#000000', '#FFFFFF']
          });
        }
      }, 5000);
    }
  };

  if (!room) return null;

  const isHost = room.hostId === user.uid;
  const myPlayer = room.players.find(p => p.uid === user.uid);

  const optionsToDisplay = useMemo(() => {
    if (!room || room.status !== 'playing') return [];
    const currentQuestion = room.questions[room.currentQuestionIndex];
    const options = currentQuestion.options || [];
    
    if (activePowerups.fiftyFifty && room.gameType === 'quiz') {
      const correctAnswer = currentQuestion.answer;
      const incorrectOptions = options.filter(o => o !== correctAnswer);
      const randomIncorrect = incorrectOptions[Math.floor(Math.random() * incorrectOptions.length)];
      return [correctAnswer, randomIncorrect].sort();
    }
    return options;
  }, [room?.currentQuestionIndex, activePowerups.fiftyFifty, room?.status]);

  return (
    <div className="flex-1 bg-white p-4 lg:p-12 flex flex-col overflow-hidden">
      <header className="flex justify-between items-center mb-12 border-b-8 border-black pb-8">
        <div className="flex items-center gap-6">
          <div className={`p-4 hidden md:block ${room.isKidFriendly ? 'bg-[#B19CD9] text-white' : 'bg-black text-[#00FF00]'}`}>
            <Gamepad2 className="h-10 w-10" />
          </div>
          <div>
            <h2 className="font-display text-5xl uppercase leading-none">{room.theme}</h2>
            <p className="font-black uppercase text-xs tracking-widest mt-2">
              <span className={`px-2 py-0.5 border-2 border-black mr-2 ${room.isKidFriendly ? 'bg-[#FFB7C5]' : 'bg-[#00FF00]'}`}>{room.gameType}</span>
              Hosted by {room.hostName}
              {room.isKidFriendly && <span className="ml-2 bg-[#B19CD9] text-white px-2 py-0.5 border-2 border-black">KID FRIENDLY</span>}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate('/dashboard')} variant="danger" className="text-sm px-6">LEAVE</Button>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-12 overflow-hidden">
        {/* Players Sidebar */}
        <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <h3 className="font-display text-3xl uppercase border-b-4 border-black pb-2 flex items-center justify-between">
            Players <Users className="h-6 w-6" />
          </h3>
          <div className="space-y-4">
            {room.players.sort((a, b) => b.score - a.score).map((p, idx) => (
              <motion.div 
                key={p.uid} 
                layout
                className={`brutal-card p-4 flex justify-between items-center relative ${p.uid === user.uid ? (room.isKidFriendly ? 'bg-[#FFB7C5]/20' : 'bg-[#00FF00]/10') : ''}`}
              >
                {idx === 0 && room.status !== 'waiting' && (
                  <div className="absolute -top-3 -left-3 rotate-[-20deg]">
                    <Crown className="h-8 w-8 text-yellow-400 fill-yellow-400 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" />
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className={`h-4 w-4 rounded-full border-2 border-black ${p.isReady ? (room.isKidFriendly ? 'bg-[#B19CD9]' : 'bg-[#00FF00]') : 'bg-red-500'}`} />
                  <div className="flex flex-col">
                    <span className="font-black uppercase text-sm truncate max-w-[120px]">{p.displayName}</span>
                    <div className="flex gap-2 items-center">
                      {p.lastAnswer && <span className="text-[10px] font-bold opacity-40">ANSWERED</span>}
                      {p.streak >= 3 && (
                        <span className={`text-[10px] font-black px-1 border border-black ${room.isKidFriendly ? 'bg-[#FFB7C5]' : 'bg-[#00FF00]'}`}>
                          🔥 {p.streak}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="font-display text-3xl">{p.score}</span>
              </motion.div>
            ))}
          </div>
          {room.status === 'waiting' && !myPlayer && (
            <Button onClick={handleJoin} variant="primary" className={`w-full text-xl py-6 ${room.isKidFriendly ? 'bg-[#B19CD9]' : ''}`}>JOIN GAME</Button>
          )}

          {/* Chat */}
          <div className="pt-6">
            <Chat roomId={room.id} user={user} />
          </div>
        </div>

        {/* Main Game Area */}
        <div className="lg:col-span-3 flex flex-col">
          <AnimatePresence mode="wait">
            {room.status === 'waiting' && (
              <motion.div 
                key="waiting"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className={`brutal-card flex-1 flex flex-col items-center justify-center text-center p-12 ${room.isKidFriendly ? 'bg-[#FFB7C5]/5' : 'bg-[#00FF00]/5'}`}
              >
                <div className={`big-number mb-8 animate-bounce ${room.isKidFriendly ? 'text-[#B19CD9]' : 'text-[#00FF00]'}`}>?</div>
                <h3 className="text-7xl font-display mb-8 uppercase leading-none tracking-tighter">{room.isKidFriendly ? 'Magical' : 'Lobby'}<br />{room.isKidFriendly ? 'Waiting' : 'Chaos'}</h3>
                <div className={`brutal-card p-8 mb-12 max-w-2xl relative ${room.isKidFriendly ? 'bg-[#B19CD9] text-white' : 'bg-black text-white'}`}>
                  <Volume2 className={`absolute -top-6 -left-6 h-12 w-12 p-2 border-4 ${room.isKidFriendly ? 'text-white bg-[#FFB7C5] border-white' : 'text-[#00FF00] bg-black border-[#00FF00]'}`} />
                  <p className="text-2xl font-black italic">"{room.intro}"</p>
                </div>
                
                {isHost ? (
                  <div className="space-y-6">
                    <p className={`font-black uppercase tracking-[0.3em] text-sm px-6 py-2 ${room.isKidFriendly ? 'bg-[#FFB7C5] text-black' : 'bg-black text-white'}`}>YOU ARE THE HOST</p>
                    <Button 
                      onClick={handleStart} 
                      variant="primary" 
                      className={`text-4xl py-8 px-16 group ${room.isKidFriendly ? 'bg-[#B19CD9]' : ''}`}
                      disabled={room.players.length < 1}
                    >
                      {room.isKidFriendly ? 'START THE FUN' : 'UNLEASH CHAOS'} <Play className="inline ml-4 group-hover:scale-125 transition-transform" />
                    </Button>
                    <p className="text-xs font-bold opacity-40 uppercase">Wait for everyone to be ready!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Button 
                      onClick={handleReady} 
                      variant={myPlayer?.isReady ? 'secondary' : 'primary'}
                      className={`text-3xl py-8 px-16 ${myPlayer?.isReady ? '' : (room.isKidFriendly ? 'bg-[#B19CD9]' : '')}`}
                    >
                      {myPlayer?.isReady ? (room.isKidFriendly ? 'READY TO PLAY!' : 'READY AS HELL!') : 'I AM READY'}
                    </Button>
                    <p className="text-xs font-bold opacity-40 uppercase">Waiting for host to start...</p>
                  </div>
                )}
              </motion.div>
            )}

            {room.status === 'playing' && (
              <motion.div 
                key="playing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col space-y-8"
              >
                <div className={`brutal-card relative overflow-hidden ${room.isKidFriendly ? 'bg-[#B19CD9] text-white' : 'bg-black text-white'}`}>
                  <div className="absolute top-0 right-0 p-4 opacity-20">
                    {room.isKidFriendly ? <Sparkles className="h-24 w-24" /> : <Zap className="h-24 w-24" />}
                  </div>
                  <div className="flex justify-between items-center mb-12 relative z-10">
                    <span className={`font-display text-4xl uppercase ${room.isKidFriendly ? 'text-white' : 'text-[#00FF00]'}`}>
                      Round {room.currentQuestionIndex + 1} / {room.questions.length}
                    </span>
                    <div className={`flex items-center gap-4 font-black px-4 py-2 border-4 border-white ${room.isKidFriendly ? 'bg-[#FFB7C5] text-black' : 'bg-[#00FF00] text-black'}`}>
                      <Timer className="h-6 w-6 animate-spin-slow" /> 
                      {room.players.filter(p => p.lastAnswer).length} / {room.players.length} ANSWERED
                    </div>
                  </div>
                  <h3 className="text-5xl font-display mb-8 uppercase leading-[0.9] tracking-tighter relative z-10">
                    {room.questions[room.currentQuestionIndex].text}
                  </h3>
                </div>

                <div className="flex-1">
                  {room.gameType === 'quiz' ? (
                    <div className="flex flex-col gap-8">
                      {!submitted && (
                        <div className="grid grid-cols-2 gap-4">
                          <Button 
                            disabled={myPlayer?.powerups.fiftyFiftyUsed || activePowerups.fiftyFifty}
                            onClick={() => setActivePowerups(prev => ({ ...prev, fiftyFifty: true }))}
                            className={`py-4 text-xs font-black uppercase ${activePowerups.fiftyFifty ? (room.isKidFriendly ? 'bg-[#FFB7C5]' : 'bg-[#00FF00]') : 'bg-gray-100'}`}
                          >
                            50/50 {myPlayer?.powerups.fiftyFiftyUsed && '✅'}
                          </Button>
                          <Button 
                            disabled={myPlayer?.powerups.doublePointsUsed || activePowerups.doublePoints}
                            onClick={() => setActivePowerups(prev => ({ ...prev, doublePoints: true }))}
                            className={`py-4 text-xs font-black uppercase ${activePowerups.doublePoints ? (room.isKidFriendly ? 'bg-[#FFB7C5]' : 'bg-[#00FF00]') : 'bg-gray-100'}`}
                          >
                            2X POINTS {myPlayer?.powerups.doublePointsUsed && '✅'}
                          </Button>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {optionsToDisplay.map((opt, idx) => (
                          <motion.button
                            key={idx}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSubmitAnswer(opt)}
                            disabled={submitted}
                            className={`brutal-btn text-left text-2xl normal-case h-auto py-8 px-10 flex items-start gap-6 group ${
                              submitted && opt === room.questions[room.currentQuestionIndex].answer ? (room.isKidFriendly ? 'bg-[#FFB7C5]' : 'bg-[#00FF00]') : 
                              submitted && opt === answer ? 'bg-red-500' : 'bg-white'
                            }`}
                          >
                            <span className="font-display text-4xl opacity-20 group-hover:opacity-100 transition-opacity">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="font-black uppercase">{opt}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="brutal-card p-12 flex flex-col items-center gap-8">
                      <input 
                        className={`brutal-input text-4xl py-10 text-center uppercase ${room.isKidFriendly ? 'border-[#B19CD9] focus:ring-[#FFB7C5]' : ''}`}
                        placeholder={room.isKidFriendly ? "GUESS THE MAGIC WORD..." : "TYPE YOUR ANSWER..."}
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        disabled={submitted}
                        onKeyDown={e => e.key === 'Enter' && handleSubmitAnswer(answer)}
                      />
                      {!submitted && (
                        <Button onClick={() => handleSubmitAnswer(answer)} variant="primary" className={`text-3xl px-16 py-6 ${room.isKidFriendly ? 'bg-[#B19CD9]' : ''}`}>
                          SUBMIT ANSWER
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {showExplanation && (
                    <motion.div 
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 50 }}
                      className={`brutal-card border-black p-8 relative overflow-hidden ${room.isKidFriendly ? 'bg-[#FFB7C5]' : 'bg-[#00FF00]'}`}
                    >
                      <div className="absolute -right-8 -bottom-8 opacity-10">
                        <Sparkles className="h-48 w-48" />
                      </div>
                      <div className="flex items-center gap-6 mb-4 relative z-10">
                        {answer.toLowerCase().trim() === room.questions[room.currentQuestionIndex].answer.toLowerCase().trim() ? 
                          <div className="bg-black p-3 rounded-full"><CheckCircle2 className={`${room.isKidFriendly ? 'text-[#B19CD9]' : 'text-[#00FF00]'} h-8 w-8`} /></div> : 
                          <div className="bg-black p-3 rounded-full"><XCircle className="text-red-500 h-8 w-8" /></div>
                        }
                        <div>
                          <span className="font-display text-4xl uppercase leading-none">
                            {answer.toLowerCase().trim() === room.questions[room.currentQuestionIndex].answer.toLowerCase().trim() ? (room.isKidFriendly ? 'YAY! YOU GOT IT!' : 'BOOM! CORRECT!') : (room.isKidFriendly ? 'OH NO! TRY AGAIN!' : 'OOF! WRONG!')}
                          </span>
                          <p className="font-black uppercase text-sm mt-1">The answer was: {room.questions[room.currentQuestionIndex].answer}</p>
                        </div>
                      </div>
                      <p className="text-xl font-black italic relative z-10 border-t-4 border-black pt-4 mt-4">
                        "{room.questions[room.currentQuestionIndex].explanation}"
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {room.status === 'finished' && (
              <motion.div 
                key="finished"
                initial={{ opacity: 0, rotate: -5 }}
                animate={{ opacity: 1, rotate: 0 }}
                className={`brutal-card flex-1 flex flex-col items-center justify-center text-center p-12 bg-white relative overflow-hidden ${room.isKidFriendly ? 'border-[#B19CD9]' : ''}`}
              >
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                  {[...Array(20)].map((_, i) => (
                    <Trophy key={i} className="absolute" style={{ 
                      top: `${Math.random() * 100}%`, 
                      left: `${Math.random() * 100}%`,
                      transform: `rotate(${Math.random() * 360}deg)`
                    }} />
                  ))}
                </div>
                
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Trophy className={`h-48 w-48 mx-auto mb-8 drop-shadow-[8px_8px_0px_rgba(0,0,0,1)] ${room.isKidFriendly ? 'text-[#B19CD9]' : 'text-[#00FF00]'}`} />
                </motion.div>
                
                <h3 className="text-8xl font-display mb-12 uppercase leading-none tracking-tighter">
                  {room.isKidFriendly ? 'Magic\nOver' : 'Chaos\nOver'}
                </h3>
                
                <div className="w-full max-w-2xl mx-auto space-y-6 mb-16">
                  {room.players.sort((a, b) => b.score - a.score).map((p, i) => (
                    <motion.div 
                      key={p.uid} 
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex justify-between items-center p-6 border-8 border-black ${i === 0 ? (room.isKidFriendly ? 'bg-[#FFB7C5] scale-110 z-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]' : 'bg-[#00FF00] scale-110 z-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]') : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
                    >
                      <div className="flex items-center gap-6">
                        <span className="font-display text-5xl">#{i + 1}</span>
                        <div className="text-left">
                          <span className="font-black text-2xl uppercase block leading-none">{p.displayName}</span>
                          <span className="text-xs font-bold opacity-40 uppercase tracking-widest">{p.score} POINTS</span>
                        </div>
                      </div>
                      {i === 0 && <Crown className="h-10 w-10" />}
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-6 w-full max-w-md">
                  <Button onClick={() => navigate('/dashboard')} variant="primary" className={`flex-1 text-2xl py-8 ${room.isKidFriendly ? 'bg-[#B19CD9]' : ''}`}>
                    LOBBY
                  </Button>
                  {isHost && (
                    <Button onClick={() => navigate('/create')} className={`flex-1 text-2xl py-8 ${room.isKidFriendly ? 'bg-[#FFB7C5]' : ''}`}>
                      NEW GAME
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

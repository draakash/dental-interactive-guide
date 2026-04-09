import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, setDoc, increment, query, where } from 'firebase/firestore';
import './App.css';
import { registry } from './PluginRegistry';
import './ExamplePlugin.jsx'; // Initialize all active plugins
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import imageCompression from 'browser-image-compression';
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor';

function App() {
  // State to track which "page" the user is currently viewing
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname;
    if (path === '/superaakash') return 'admin-dashboard';
    if (path === '/privacy-policy') return 'privacy-policy';
    if (path === '/terms-conditions') return 'terms-conditions';
    if (path === '/seo-sitemap') return 'seo-sitemap';
    if (path === '/support') return 'support';
    if (path === '/profile') return 'profile';
    if (path === '/search') return 'search';
    if (path === '/upload') return 'upload';
    if (path === '/inbox') return 'inbox';
    if (path === '/chat') return 'chat';
    if (path === '/activity') return 'activity';
    if (path.startsWith('/article/')) return path.replace('/article/', '');
    return 'home';
  });
  
  // Production Firebase Auth State
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [dentistRegNo, setDentistRegNo] = useState('');
  const [dentistSpecialty, setDentistSpecialty] = useState('');
  const [dentistExperience, setDentistExperience] = useState('');
  const [isApplyingDentist, setIsApplyingDentist] = useState(false);
  const ADMIN_EMAIL = 'draakasharora@gmail.com';
  const [adminTab, setAdminTab] = useState('users'); // For the WordPress-like dashboard

  // Landmark Interactive State
  const [landmarks, setLandmarks] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [newLandmarkData, setNewLandmarkData] = useState({ name: '', diseases: '', specialists: '', treatments: '' });
  const [editingLandmarkId, setEditingLandmarkId] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [activeContextMenu, setActiveContextMenu] = useState(null);

  // Storage & Upload State
  const [imageFiles, setImageFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Dynamic Procedures State
  const [procedures, setProcedures] = useState([]);
  const [editingProcedureId, setEditingProcedureId] = useState(null);
  const [newProcedure, setNewProcedure] = useState({ 
    title: '', 
    category: 'Anatomy',
    shortDesc: '', 
    content: '', 
    imageUrl: '', 
    imageUrls: [],
    referenceLink: '',
    visibility: 'public',
    hasPoll: false,
    pollQuestion: '',
    pollOptions: ['', ''],
    isResolved: false
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterSpecialty, setFilterSpecialty] = useState('All');

  // Threaded Discussion State
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(null);
  const [selectedForDeletion, setSelectedForDeletion] = useState([]);
  const [visibleCount, setVisibleCount] = useState(12);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showHeartMap, setShowHeartMap] = useState({});
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [chatImageFile, setChatImageFile] = useState(null);
  const [isSendingChatImage, setIsSendingChatImage] = useState(false);
  const [reports, setReports] = useState([]);
  
  const [patientConsent, setPatientConsent] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [supportSearch, setSupportSearch] = useState('');
  const [selectedSupportTopic, setSelectedSupportTopic] = useState(null);
  const [sponsorText, setSponsorText] = useState('Best Dentist in Delhi NCR / Ghaziabad');

  // Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editProfilePicFile, setEditProfilePicFile] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Image Editor State
  const [editorConfig, setEditorConfig] = useState(null); // { file, index, type, src }

  // Infinite Scroll Observer
  const observer = useRef();
  const lastElementRef = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 12);
      }
    });
    if (node) observer.current.observe(node);
  }, []);

  // Clear selected support topic if navigating away
  useEffect(() => {
    if (currentPage !== 'support') setSelectedSupportTopic(null);
  }, [currentPage]);

  // PWA Setup & Install Prompt
  useEffect(() => {
    // Dynamically inject the manifest link
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);
    }

    // Register the Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    }

    // Listen for the "Add to Home Screen" browser prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e); // Save the event so we can trigger it with our custom button
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Apply Dark Mode & PWA Theme Color
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');
    
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = darkMode ? '#121212' : '#ffffff';
  }, [darkMode]);

  // Fetch user's approximate location silently for the subtle footer referral
  useEffect(() => {
    fetch('https://get.geojs.io/v1/ip/geo.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.country === 'India') {
          const northIndia = ['Delhi', 'Uttar Pradesh', 'Haryana', 'Punjab', 'Rajasthan', 'Uttarakhand', 'Himachal Pradesh', 'Chandigarh'];
          if (northIndia.includes(data.region)) {
            setSponsorText('Best Dentist in Ghaziabad');
          } else {
            setSponsorText('Best Dentist in India');
          }
        }
      })
      .catch(e => console.log('Silent location fetch skipped', e));
  }, []);

  // Sync URL with state changes so links are shareable
  useEffect(() => {
    let path = '/';
    if (currentPage === 'admin-dashboard') path = '/superaakash';
    else if (currentPage === 'privacy-policy') path = '/privacy-policy';
    else if (currentPage === 'terms-conditions') path = '/terms-conditions';
    else if (currentPage === 'seo-sitemap') path = '/seo-sitemap';
    else if (currentPage === 'support') path = '/support';
    else if (currentPage === 'profile') path = '/profile';
    else if (currentPage === 'search') path = '/search';
    else if (currentPage === 'inbox') path = '/inbox';
    else if (currentPage === 'chat') path = '/chat';
    else if (currentPage === 'upload') path = '/upload';
    else if (currentPage === 'activity') path = '/activity';
    else if (currentPage !== 'home') path = `/article/${currentPage}`;
    
    const fullPath = basePath + path;
    if (window.location.pathname !== fullPath) {
      window.history.pushState({}, '', fullPath);
    }
  }, [currentPage, basePath]);

  // Handle browser back/forward buttons natively
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(basePath, '') || '/';
      if (path === '/superaakash') setCurrentPage('admin-dashboard');
      else if (path === '/privacy-policy') setCurrentPage('privacy-policy');
      else if (path === '/terms-conditions') setCurrentPage('terms-conditions');
      else if (path === '/seo-sitemap') setCurrentPage('seo-sitemap');
      else if (path === '/support') setCurrentPage('support');
      else if (path === '/profile') setCurrentPage('profile');
      else if (path === '/search') setCurrentPage('search');
      else if (path === '/inbox') setCurrentPage('inbox');
      else if (path === '/chat') setCurrentPage('chat');
      else if (path === '/upload') setCurrentPage('upload');
      else if (path === '/activity') setCurrentPage('activity');
      else if (path.startsWith('/article/')) setCurrentPage(path.replace('/article/', ''));
      else setCurrentPage('home');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Track Views (Increments after 2 seconds on an article page to ensure it's a real view)
  useEffect(() => {
    const isArticle = !['home', 'search', 'upload', 'inbox', 'chat', 'activity', 'profile', 'admin-dashboard', 'support', 'privacy-policy', 'terms-conditions', 'seo-sitemap'].includes(currentPage);
    if (isArticle) {
      const timer = setTimeout(() => {
        const proc = procedures.find(p => p.id === currentPage);
        if (proc) {
          updateDoc(doc(db, 'procedures', currentPage), { views: increment(1) }).catch(e => console.error("View tracking error:", e));
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentPage, db, procedures]);

  // Real-time listener for Notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const notifsRef = collection(db, 'users', user.uid, 'notifications');
    const unsubscribe = onSnapshot(notifsRef, (snapshot) => {
      const notifsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      notifsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(notifsData);
    });
    return () => unsubscribe();
  }, [user, db]);

  // Real-time listener for Direct Messages (Inbox)
  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      chatsData.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
      setChats(chatsData);
    });
    return () => unsubscribe();
  }, [user, db]);

  // Real-time listener for Active Chat Messages
  useEffect(() => {
    if (currentPage !== 'chat' || !activeChat) return setChatMessages([]);
    const q = query(collection(db, 'chats', activeChat.id, 'messages'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setChatMessages(msgs);
    });
    return () => unsubscribe();
  }, [currentPage, activeChat, db]);

  // Real-time listener for Admin Reports
  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      setReports([]);
      return;
    }
    const unsubscribe = onSnapshot(collection(db, "reports"), (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      reportsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReports(reportsData);
    });
    return () => unsubscribe();
  }, [userProfile?.role, db]);

  // Reset pagination when search/filters change
  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, filterCategory, filterSpecialty]);

  // Listen for authentication state changes (Maintains login after refresh)
  useEffect(() => {
    let unsubscribeUserProfile;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        unsubscribeUserProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          } else {
            // Create basic profile on first login
            const newUserName = currentUser.displayName || currentUser.email.split('@')[0];
            setDoc(userRef, {
              email: currentUser.email,
              name: newUserName,
              role: currentUser.email === ADMIN_EMAIL ? 'admin' : 'user',
              storageUsed: 0,
              storageQuota: 25 * 1024 * 1024 // Default 25 MB
            }).then(async () => {
              // Generate automated Welcome DM
              const systemId = 'system-admin';
              const welcomeChat = {
                participants: [systemId, currentUser.uid],
                participantNames: {
                  [systemId]: 'DentalGuide Team',
                  [currentUser.uid]: newUserName
                },
                lastMessage: 'Welcome to the platform! 👋',
                lastUpdated: new Date().toISOString()
              };
              const chatRef = await addDoc(collection(db, 'chats'), welcomeChat);
              await addDoc(collection(db, 'chats', chatRef.id, 'messages'), {
                senderId: systemId,
                text: 'Welcome to Dental Interactive Guide! 👋\n\nThis is a dedicated space for dental professionals and patients to share, discuss, and learn from clinical cases.\n\nFeel free to explore the feed, submit a case, or apply for a Specialist account from your profile. Let us know if you have any questions!',
                createdAt: new Date().toISOString()
              });
            }).catch(err => console.error("Error creating user profile:", err));
          }
        });
      } else {
        setUserProfile(null);
        if (unsubscribeUserProfile) unsubscribeUserProfile();
      }
    });
    
    // Real-time listener for landmarks from Firestore Database
    const unsubscribeDb = onSnapshot(collection(db, "landmarks"), (snapshot) => {
      const landmarksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLandmarks(landmarksData);
    });

    // Real-time listener for Procedures from Firestore Database
    const unsubscribeProcedures = onSnapshot(collection(db, "procedures"), (snapshot) => {
      const procData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProcedures(procData);
    });

    // Real-time listener for All Users (Admin only needs this for approvals, but safe to sync)
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDb();
      unsubscribeProcedures();
      unsubscribeUsers();
    };
  }, []);

  // Listen for Comments on the currently viewed Case/Article
  useEffect(() => {
    if (['home', 'search', 'upload', 'inbox', 'chat', 'activity', 'profile', 'admin-dashboard', 'support', 'privacy-policy', 'terms-conditions', 'seo-sitemap'].includes(currentPage)) {
      setComments([]);
      return;
    }

    const commentsRef = collection(db, 'procedures', currentPage, 'comments');
    const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      commentsData.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0) || new Date(a.createdAt) - new Date(b.createdAt));
      setComments(commentsData);
    });
    return () => unsubscribe();
  }, [currentPage]);

  // --- Social Actions (Likes, Follows, Notifications) ---
  const notifyUser = async (targetUserId, type, message, linkId) => {
    if (!user || targetUserId === user.uid) return; // Don't notify yourself
    
    const targetUserDoc = allUsers.find(u => u.id === targetUserId);
    if (targetUserDoc?.blockedUsers?.includes(user.uid)) return; // Don't send notification if they blocked us

    try {
      await addDoc(collection(db, 'users', targetUserId, 'notifications'), {
        type,
        message,
        linkId,
        read: false,
        createdAt: new Date().toISOString(),
        actorName: userProfile?.name || user.email,
        actorId: user.uid
      });
    } catch (err) {
      console.error("Error sending notification:", err);
    }
  };

  const handleToggleLike = async (proc) => {
    if (!user) return setShowLoginModal(true);
    const likes = proc.likes || [];
    const isLiked = likes.includes(user.uid);
    const newLikes = isLiked ? likes.filter(id => id !== user.uid) : [...likes, user.uid];
    try {
      await updateDoc(doc(db, 'procedures', proc.id), { likes: newLikes });
      if (!isLiked) notifyUser(proc.authorId, 'like', `liked your case "${proc.title}"`, proc.id);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleDoubleTap = (proc) => {
    if (!proc.likes?.includes(user?.uid)) handleToggleLike(proc);
    setShowHeartMap(prev => ({...prev, [proc.id]: true}));
    setTimeout(() => setShowHeartMap(prev => ({...prev, [proc.id]: false})), 1000);
  };

  const handleToggleFollow = async (targetUserId) => {
    if (!user) return setShowLoginModal(true);
    const following = userProfile?.following || [];
    const isFollowing = following.includes(targetUserId);
    const newFollowing = isFollowing ? following.filter(id => id !== targetUserId) : [...following, targetUserId];
    try {
      await updateDoc(doc(db, 'users', user.uid), { following: newFollowing });
      if (!isFollowing) notifyUser(targetUserId, 'follow', `started following you`, 'profile');
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  // --- Direct Messaging System ---
  const startChat = async (targetUserId, targetUserName) => {
    if (!user) return setShowLoginModal(true);
    if (targetUserId === user.uid) return; // Can't chat with self
    
    let chat = chats.find(c => c.participants.includes(targetUserId));
    if (!chat) {
      const newChat = {
        participants: [user.uid, targetUserId],
        participantNames: {
          [user.uid]: userProfile?.name || user.email,
          [targetUserId]: targetUserName
        },
        lastUpdated: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'chats'), newChat);
      chat = { id: docRef.id, ...newChat };
    }
    setActiveChat(chat);
    setCurrentPage('chat');
  };

  const handleSendMessage = async () => {
    if ((!newChatMessage.trim() && !chatImageFile) || !activeChat) return;
    
    const otherUserId = activeChat.participants.find(id => id !== user.uid);
    const otherUserDoc = allUsers.find(u => u.id === otherUserId);
    if (userProfile?.blockedUsers?.includes(otherUserId) || otherUserDoc?.blockedUsers?.includes(user.uid)) {
      return alert("Message cannot be sent.");
    }

    try {
      setIsSendingChatImage(true);
      let uploadedChatImageUrl = null;

      if (chatImageFile) {
        const compressed = await imageCompression(chatImageFile, { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true });
        const formData = new FormData();
        formData.append('image', compressed);
        const res = await fetch('https://dentistnearghaziabad.in/Dental%20Interactive%20guide/upload.php', { method: 'POST', body: formData });
        if (res.ok) {
          const json = await res.json();
          uploadedChatImageUrl = json.imageUrl;
        }
      }

      const msg = newChatMessage;
      setNewChatMessage('');
      setChatImageFile(null);

      await addDoc(collection(db, 'chats', activeChat.id, 'messages'), {
        senderId: user.uid,
        text: msg,
        imageUrl: uploadedChatImageUrl,
        createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: uploadedChatImageUrl ? '📷 Image' : msg,
        lastUpdated: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error sending message:", e);
    } finally {
      setIsSendingChatImage(false);
    }
  };

  const handleReport = async (type, targetId, commentId = null) => {
    if (!user) return setShowLoginModal(true);
    const reason = window.prompt("Please provide a reason for reporting this content (e.g., Spam, Privacy Violation, Inappropriate):");
    if (!reason) return;

    try {
      await addDoc(collection(db, "reports"), {
        type,
        targetId,
        commentId,
        reason,
        reportedBy: user.uid,
        reporterName: userProfile?.name || user.email,
        createdAt: new Date().toISOString()
      });
      alert("Thank you. The content has been reported to the administration.");
    } catch (err) {
      console.error("Error reporting:", err);
      alert("Failed to submit report.");
    }
  };

  // --- Image Editing Functions ---
  const openEditor = (file, index, type) => {
    const src = URL.createObjectURL(file);
    setEditorConfig({ file, index, type, src });
  };

  const handleSaveEditedImage = async (editedImageObject) => {
    try {
      const res = await fetch(editedImageObject.imageBase64);
      const blob = await res.blob();
      const newFile = new File([blob], editorConfig.file.name || 'edited_image.jpg', { type: blob.type || 'image/jpeg' });
      
      if (editorConfig.type === 'chat') {
        setChatImageFile(newFile);
      } else if (editorConfig.type === 'procedure') {
        setImageFiles(prev => {
          const newArr = [...prev];
          newArr[editorConfig.index] = newFile;
          return newArr;
        });
      }
      setEditorConfig(null);
    } catch (err) {
      console.error("Error saving edited image:", err);
      alert("Failed to save the edited image. Please try again.");
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      let newPicUrl = userProfile?.profilePic || null;
      if (editProfilePicFile) {
        const compressed = await imageCompression(editProfilePicFile, { maxSizeMB: 0.5, maxWidthOrHeight: 500, useWebWorker: true });
        const formData = new FormData();
        formData.append('image', compressed);
        const res = await fetch('https://dentistnearghaziabad.in/Dental%20Interactive%20guide/upload.php', { method: 'POST', body: formData });
        if (res.ok) {
          const json = await res.json();
          newPicUrl = json.imageUrl;
        }
      }
      await updateDoc(doc(db, 'users', user.uid), {
        bio: editBio,
        profilePic: newPicUrl
      });
      setIsEditingProfile(false);
    } catch (e) {
      console.error("Error updating profile:", e);
      alert("Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleVotePoll = async (procId, optionIndex) => {
    if (!user) return setShowLoginModal(true);
    const proc = procedures.find(p => p.id === procId);
    if (!proc || !proc.poll) return;
    
    const votedUsers = proc.poll.votedUsers || {};
    if (votedUsers[user.uid] !== undefined) return; // Already voted

    try {
      const newPoll = { ...proc.poll };
      newPoll.options[optionIndex].votes += 1;
      newPoll.votedUsers = { ...votedUsers, [user.uid]: optionIndex };
      await updateDoc(doc(db, 'procedures', procId), { poll: newPoll });
    } catch (e) {
      console.error("Error voting on poll:", e);
    }
  };

  const renderPoll = (proc) => {
    if (!proc.poll) return null;
    const totalVotes = proc.poll.options.reduce((sum, o) => sum + o.votes, 0);
    const hasVoted = user && proc.poll.votedUsers && proc.poll.votedUsers[user.uid] !== undefined;

    return (
      <div className="poll-container" onClick={(e) => e.stopPropagation()}>
        <div className="poll-question">📊 {proc.poll.question}</div>
        <div className="poll-options">
          {proc.poll.options.map((opt, idx) => {
            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
            const isMyVote = hasVoted && proc.poll.votedUsers[user.uid] === idx;
            
            return hasVoted || (!user && totalVotes > 0) ? (
              <div key={idx} className={`poll-result ${isMyVote ? 'my-vote' : ''}`}>
                <div className="poll-bar" style={{ width: `${percent}%` }}></div>
                <div className="poll-label">
                  <span>{opt.text} {isMyVote && '✓'}</span>
                  <span>{percent}%</span>
                </div>
              </div>
            ) : (
              <button key={idx} className="poll-option-btn" onClick={() => handleVotePoll(proc.id, idx)}>{opt.text}</button>
            );
          })}
        </div>
        <div className="poll-footer">{totalVotes} votes</div>
      </div>
    );
  };

  const handleShareToUser = async (targetUser) => {
    try {
      let chat = chats.find(c => c.participants.includes(targetUser.id));
      if (!chat) {
        const newChat = {
          participants: [user.uid, targetUser.id],
          participantNames: {
            [user.uid]: userProfile?.name || user.email,
            [targetUser.id]: targetUser.name
          },
          lastUpdated: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'chats'), newChat);
        chat = { id: docRef.id, ...newChat };
      }

      const proc = showShareModal;
      const imageToSend = (proc.imageUrls && proc.imageUrls.length > 0) ? proc.imageUrls[0] : proc.imageUrl;

      await addDoc(collection(db, 'chats', chat.id, 'messages'), {
        senderId: user.uid,
        text: `Shared a case: ${proc.title}`,
        imageUrl: imageToSend,
        caseId: proc.id,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: `Shared a case: ${proc.title}`,
        lastUpdated: new Date().toISOString()
      });

      alert("Case shared successfully!");
      setShowShareModal(null);
    } catch (e) {
      console.error("Error sharing:", e);
      alert("Failed to share case.");
    }
  };

  const handleToggleBlock = async (targetUserId) => {
    if (!user) return;
    const blocked = userProfile?.blockedUsers || [];
    const isBlocked = blocked.includes(targetUserId);
    const newBlocked = isBlocked ? blocked.filter(id => id !== targetUserId) : [...blocked, targetUserId];
    try {
      await updateDoc(doc(db, 'users', user.uid), { blockedUsers: newBlocked });
    } catch (e) {
      console.error("Error blocking user:", e);
    }
  };

  const handleLogin = async (intent = 'user') => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowLoginModal(false);
      
      // Automatically route them based on what they clicked in the popup
      if (intent === 'dentist') {
        setIsApplyingDentist(true);
      } else if (intent === 'upload') {
        setCurrentPage('upload');
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("Failed to login. Please try again.");
    }
  };

  const handleLogout = () => signOut(auth);

  const handleImageClick = (e) => {
    // Close any open tooltips or menus if clicking on the background image
    setActiveTooltip(null);
    setActiveContextMenu(null);

    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (e.target.tagName !== 'IMG') return; // Only trigger if clicking directly on the image

    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setActiveInput({ x, y });
    setNewLandmarkData({ name: '', diseases: '', specialists: '', treatments: '' });
    setEditingLandmarkId(null);
  };

  const saveLandmark = async () => {
    if (!newLandmarkData.name.trim()) return setActiveInput(null);
    
    try {
      if (editingLandmarkId) {
        await updateDoc(doc(db, "landmarks", editingLandmarkId), { 
          name: newLandmarkData.name.trim(),
          diseases: newLandmarkData.diseases.trim(),
          specialists: newLandmarkData.specialists.trim(),
          treatments: newLandmarkData.treatments.trim()
        });
      } else {
        const newLandmark = {
          x: activeInput.x,
          y: activeInput.y,
          name: newLandmarkData.name.trim(),
          diseases: newLandmarkData.diseases.trim(),
          specialists: newLandmarkData.specialists.trim(),
          treatments: newLandmarkData.treatments.trim(),
          status: user.email === ADMIN_EMAIL ? 'approved' : 'pending',
          authorEmail: user.email,
          authorName: user.displayName || user.email.split('@')[0],
          createdAt: new Date().toISOString(),
          imageId: currentPage
        };
        await addDoc(collection(db, "landmarks"), newLandmark);
      }
      
      setActiveInput(null);
      setEditingLandmarkId(null);
    } catch (error) {
      console.error("Error saving landmark:", error);
      alert("Failed to save landmark to database.");
    }
  };

  const deleteLandmark = async (id) => {
    try {
      await deleteDoc(doc(db, "landmarks", id));
    } catch (error) {
      console.error("Error deleting landmark:", error);
    }
  };

  const approveLandmark = async (id) => {
    try {
      await updateDoc(doc(db, "landmarks", id), { status: 'approved' });
    } catch (error) {
      console.error("Error approving landmark:", error);
    }
  };

  const startEditLandmark = (lm) => {
    setEditingLandmarkId(lm.id);
    setActiveInput({ x: lm.x, y: lm.y });
    setNewLandmarkData({
      name: lm.name,
      diseases: lm.diseases || '',
      specialists: lm.specialists || '',
      treatments: lm.treatments || ''
    });
    setActiveContextMenu(null);
    setActiveTooltip(null);
  };

  // --- Admin Procedure Functions ---
  const startEditProcedure = (proc, e) => {
    if (e) e.stopPropagation();
    setEditingProcedureId(proc.id);
    setNewProcedure({
      title: proc.title,
      category: proc.category || 'Anatomy',
      shortDesc: proc.shortDesc || '',
      content: proc.content || '',
      imageUrl: proc.imageUrl || '',
      imageUrls: proc.imageUrls || [],
      referenceLink: proc.referenceLink || '',
      visibility: proc.visibility || 'public',
      hasPoll: !!proc.poll,
      pollQuestion: proc.poll ? proc.poll.question : '',
      pollOptions: proc.poll ? proc.poll.options.map(o => o.text) : ['', ''],
      isResolved: proc.isResolved || false
    });
    setImageFiles([]);
    setPatientConsent(false);
    setCurrentPage('upload');
  };

  const handleAddProcedure = async (overrideParams = {}) => {
    const procedureData = { ...newProcedure, ...overrideParams };
    
    if (!procedureData.title) {
      alert("Title is required.");
      return;
    }
    if (imageFiles.length === 0 && !procedureData.imageUrl && (!procedureData.imageUrls || procedureData.imageUrls.length === 0)) {
      alert("Please upload at least one image or provide an image URL.");
      return;
    }

    setIsUploading(true);
    try {
      let uploadedUrls = [...(procedureData.imageUrls || [])];
      let totalNewFileSize = 0;
      const compressedFiles = [];

      // Compress all new images before uploading and quota check
      if (imageFiles.length > 0) {
        for (let file of imageFiles) {
          if (file.type.startsWith('image/')) {
            try {
              const compressed = await imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true });
              compressedFiles.push(compressed);
              totalNewFileSize += compressed.size;
            } catch (error) {
              console.error("Compression error on file", file.name, error);
            }
          }
        }
      }

      const currentUsed = userProfile?.storageUsed || 0;
      const currentQuota = userProfile?.storageQuota || (25 * 1024 * 1024);

      if (totalNewFileSize > 0 && (totalNewFileSize + currentUsed > currentQuota)) {
        setIsUploading(false);
        alert(`Storage limit exceeded! You have ${(currentQuota/(1024*1024)).toFixed(2)} MB total quota. Please visit your profile to request an upgrade.`);
        return;
      }

      // Upload all compressed files to Custom Server
      const UPLOAD_API_URL = 'https://dentistnearghaziabad.in/Dental%20Interactive%20guide/upload.php'; 
      for (let file of compressedFiles) {
        const formData = new FormData();
        formData.append('image', file);

        const uploadResponse = await fetch(UPLOAD_API_URL, {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) throw new Error("Image upload failed");
        const result = await uploadResponse.json();
        uploadedUrls.push(result.imageUrl);
      }

      const payload = {
        ...procedureData,
        imageUrl: uploadedUrls[0] || procedureData.imageUrl,
        imageUrls: uploadedUrls,
        visibility: (userProfile?.role === 'admin' || userProfile?.role === 'dentist') ? procedureData.visibility : 'public',
        isResolved: procedureData.isResolved || false
      };

      // Attach Poll Data if enabled and valid
      if (procedureData.hasPoll && procedureData.pollQuestion && procedureData.pollOptions.filter(o => o.trim()).length >= 2) {
        payload.poll = {
          question: procedureData.pollQuestion,
          options: procedureData.pollOptions.filter(o => o.trim()).map(o => ({ text: o, votes: 0 })),
          votedUsers: {}
        };
      } else if (!procedureData.hasPoll) {
        payload.poll = null;
      }

      if (editingProcedureId) {
        await updateDoc(doc(db, "procedures", editingProcedureId), payload);
      } else {
        await addDoc(collection(db, "procedures"), {
          ...payload,
          authorId: user.uid,
          authorName: userProfile?.name || user.email,
          authorRole: userProfile?.role || 'user',
          deletionRequested: false,
          createdAt: new Date().toISOString()
        });
      }

      // Deduct quota if a physical file was uploaded
      if (totalNewFileSize > 0) {
        await updateDoc(doc(db, 'users', user.uid), {
          storageUsed: currentUsed + totalNewFileSize
        });
      }

      setEditingProcedureId(null);
      setNewProcedure({ title: '', category: 'Anatomy', shortDesc: '', content: '', imageUrl: '', imageUrls: [], referenceLink: '', visibility: 'public', hasPoll: false, pollQuestion: '', pollOptions: ['', ''], isResolved: false });
      setImageFiles([]);
      setPatientConsent(false);
      setCurrentPage('home'); // Redirect back to feed after upload
    } catch (error) {
      console.error("Error adding procedure:", error);
      alert("Failed to save media to database.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProcedure = async (id) => {
    if (window.confirm("Are you sure you want to delete this procedure completely?")) {
      await deleteDoc(doc(db, "procedures", id));
    }
  };

  const applyForDentist = async () => {
    if (!dentistRegNo.trim()) return alert('Please enter your registration number');
    await updateDoc(doc(db, 'users', user.uid), {
      role: 'pending_dentist',
      registrationNumber: dentistRegNo,
      specialty: dentistSpecialty || 'General Dentistry',
      experience: dentistExperience || 0
    });
    setIsApplyingDentist(false);
  };

  const handleToggleResolved = async (procId, currentStatus) => {
    if (window.confirm(currentStatus ? "Reopen this case?" : "Mark this case as resolved?")) {
      await updateDoc(doc(db, "procedures", procId), { isResolved: !currentStatus });
    }
  };

  // --- Discussion Thread Functions ---
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    // Automated Spam Screening
    const spamKeywords = ['viagra', 'casino', 'crypto', 'bitcoin', 'buy cheap', 'earn money', 'lottery'];
    const linkCount = (newComment.match(/https?:\/\//g) || []).length;
    const isSpam = spamKeywords.some(keyword => newComment.toLowerCase().includes(keyword)) || linkCount > 1;
    if (isSpam) {
      alert("Your comment was flagged as spam by our automated security filter and cannot be posted.");
      return;
    }

    try {
      await addDoc(collection(db, 'procedures', currentPage, 'comments'), {
        text: newComment,
        authorId: user.uid,
        authorName: userProfile?.name || user.email,
        authorRole: userProfile?.role || 'user',
        upvotes: 0,
        isFinal: false,
        createdAt: new Date().toISOString()
      });

      const proc = procedures.find(p => p.id === currentPage);
      if (proc) {
        notifyUser(proc.authorId, 'comment', `commented: "${newComment.substring(0, 30)}..."`, proc.id);
      }

      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to post comment.");
    }
  };

  const handleUpvote = async (commentId, currentUpvotes) => {
    await updateDoc(doc(db, 'procedures', currentPage, 'comments', commentId), { upvotes: (currentUpvotes || 0) + 1 });
  };

  const handleMarkFinal = async (commentId) => {
    if (userProfile?.role === 'admin') await updateDoc(doc(db, 'procedures', currentPage, 'comments', commentId), { isFinal: true });
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      await deleteDoc(doc(db, 'procedures', currentPage, 'comments', commentId));
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editCommentText.trim()) return;
    try {
      await updateDoc(doc(db, 'procedures', currentPage, 'comments', commentId), {
        text: editCommentText,
        updatedAt: new Date().toISOString()
      });
      setEditingCommentId(null);
      setEditCommentText('');
    } catch (error) {
      console.error("Error updating comment:", error);
      alert("Failed to update comment.");
    }
  };

  // --- Bookmark / Save Case Functions ---
  const handleToggleBookmark = async (procId, e) => {
    if (e) e.stopPropagation();
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    const currentBookmarks = userProfile?.bookmarkedCases || [];
    let newBookmarks;
    if (currentBookmarks.includes(procId)) {
      newBookmarks = currentBookmarks.filter(id => id !== procId);
    } else {
      newBookmarks = [...currentBookmarks, procId];
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), { bookmarkedCases: newBookmarks });
    } catch (error) {
      console.error("Error updating bookmarks:", error);
    }
  };

  // --- Admin Tools: Backup & Restore ---
  const handleExportBackup = async () => {
    const backupData = {
      users: allUsers,
      procedures: procedures,
      landmarks: landmarks
    };

    const zip = new JSZip();
    zip.file("database-backup.json", JSON.stringify(backupData, null, 2));
    
    // Generate the ZIP file and download it
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `dental-guide-backup-${new Date().toISOString().slice(0, 10)}.zip`);
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
      try {
      // Unzip the file
      const unzipped = await JSZip.loadAsync(file);
      const jsonFile = unzipped.file("database-backup.json");
      
      if (!jsonFile) {
        alert("Invalid ZIP file: Missing database-backup.json");
        return;
      }
      
      // Read the database text
      const jsonText = await jsonFile.async("string");
      const data = JSON.parse(jsonText);

        if (!window.confirm('Are you sure you want to restore? This will overwrite matching database records.')) return;

        const restoreCollection = async (collectionName, items) => {
          if (!items) return;
          for (const item of items) {
            const { id, ...docData } = item; // Strip the ID from the body before saving
            await setDoc(doc(db, collectionName, id), docData);
          }
        };

        await restoreCollection('users', data.users);
        await restoreCollection('procedures', data.procedures);
        await restoreCollection('landmarks', data.landmarks);

        alert('Backup restored successfully!');
      } catch (err) {
        console.error("Restore Error:", err);
        alert('Failed to restore backup. Please ensure it is a valid JSON file.');
      }
      e.target.value = null; // Reset input
  };

  // --- WordPress-style Admin Dashboard ---
  const renderAdminDashboard = () => {
    if (!user) {
      return (
        <div className="admin-login-page" style={{textAlign: 'center', padding: '100px 20px', minHeight: '60vh'}}>
          <h2>Admin Panel Access</h2>
          <p>Please log in with your administrator account to access this area.</p>
          <button className="btn-login-dentist" onClick={() => handleLogin('admin')} style={{marginTop: '20px'}}>
            Log in with Google
          </button>
          <br/><br/>
          <button className="back-button" onClick={() => setCurrentPage('home')}>&larr; Return to Home</button>
        </div>
      );
    }

    if (userProfile?.role !== 'admin') {
      return (
        <div className="error-page" style={{textAlign: 'center', padding: '100px 20px', minHeight: '60vh'}}>
          <h2>Access Denied</h2>
          <p>Your account ({user.email}) does not have administrator privileges.</p>
          <button className="back-button" onClick={() => setCurrentPage('home')} style={{marginTop: '20px'}}>&larr; Return to Home</button>
        </div>
      );
    }

    const handleApproveQuota = async (userId) => {
      const val = document.getElementById(`quota-${userId}`).value;
      if (val && !isNaN(val)) {
        await updateDoc(doc(db, 'users', userId), {
          storageQuota: Number(val) * 1024 * 1024,
          quotaRequested: false,
          quotaReason: ''
        });
      }
    };

    const pendingDentists = allUsers.filter(u => u.role === 'pending_dentist');
    const approvedDentists = allUsers.filter(u => u.role === 'dentist');
    const regularUsers = allUsers.filter(u => u.role === 'user');
    const quotaRequests = allUsers.filter(u => u.quotaRequested);

    return (
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <h2 className="admin-title">Admin Panel</h2>
          <nav className="admin-nav">
            <button className={adminTab === 'users' ? 'active' : ''} onClick={() => setAdminTab('users')}>👥 Users</button>
            <button className={adminTab === 'doctors' ? 'active' : ''} onClick={() => setAdminTab('doctors')}>🦷 Doctors</button>
            <button className={adminTab === 'media' ? 'active' : ''} onClick={() => setAdminTab('media')}>📁 Media</button>
            <button className={adminTab === 'appearance' ? 'active' : ''} onClick={() => setAdminTab('appearance')}>✨ Appearance</button>
            <button className={adminTab === 'tools' ? 'active' : ''} onClick={() => setAdminTab('tools')}>⚙️ Tools</button>
            <button className={adminTab === 'reports' ? 'active' : ''} onClick={() => setAdminTab('reports')}>🚩 Reports</button>
            {/* --- Plugin Admin Tabs --- */}
            {registry.getAdminTabs().map(tab => (
              <button 
                key={tab.id} 
                className={adminTab === tab.id ? 'active' : ''} 
                onClick={() => setAdminTab(tab.id)}
              >{tab.label}</button>
            ))}
          </nav>
          <button className="back-to-site" onClick={() => setCurrentPage('home')}>&larr; Back to Site</button>
        </aside>
        
        <main className="admin-content">
          {adminTab === 'users' && (
            <div className="admin-section">
              <h3>User Management</h3>
              
              {quotaRequests.length > 0 && (
                <div className="admin-approvals">
                  <h4>Pending Storage Quota Requests</h4>
                  {quotaRequests.map(u => (
                    <div key={u.id} className="approval-card">
                      <div className="doctor-info">
                        <strong>{u.name}</strong> ({u.email})
                        <span className="doc-meta">Role: {u.role} | Reason: {u.quotaReason}</span>
                        <span className="doc-meta">Current Quota: {((u.storageQuota || 25*1024*1024) / (1024*1024)).toFixed(2)} MB | Used: {((u.storageUsed || 0) / (1024*1024)).toFixed(2)} MB</span>
                        <span className="doc-meta">Media Uploaded: <strong>{procedures.filter(p => p.authorId === u.id).length} items</strong></span>
                      </div>
                      <div className="approval-actions" style={{flexDirection: 'column', gap: '5px', alignItems: 'flex-end'}}>
                        <div style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
                          <input type="number" id={`quota-${u.id}`} defaultValue={((u.storageQuota || 25*1024*1024) / (1024*1024)) + 50} style={{width: '70px', padding: '4px'}}/> MB
                        </div>
                        <div style={{display: 'flex', gap: '5px'}}>
                          <button className="btn-approve" onClick={() => handleApproveQuota(u.id)}>Approve</button>
                          <button className="btn-reject" onClick={() => updateDoc(doc(db, 'users', u.id), { quotaRequested: false, quotaReason: '' })}>Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p>Total Registered Users: {regularUsers.length}</p>
              <div className="admin-card-list">
                {regularUsers.map(u => (
                  <div key={u.id} className="admin-list-item">
                    <span>{u.name} ({u.email})</span>
                    <span className="badge badge-user">User</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab === 'doctors' && (
            <div className="admin-section">
              <h3>Manage Doctors</h3>
              
              {pendingDentists.length > 0 && (
                <div className="admin-approvals">
                  <h4>Pending Approvals</h4>
                  {pendingDentists.map(u => (
                    <div key={u.id} className="approval-card">
                      <div className="doctor-info">
                        <strong>{u.name}</strong> ({u.email})
                        <span className="doc-meta">Reg: {u.registrationNumber} | Specialty: {u.specialty} | Exp: {u.experience} yrs</span>
                      </div>
                      <div className="approval-actions">
                        <button className="btn-approve" onClick={() => updateDoc(doc(db, 'users', u.id), { role: 'dentist', storageQuota: Math.max(u.storageQuota || 0, 250 * 1024 * 1024) })}>Approve</button>
                        <button className="btn-reject" onClick={() => updateDoc(doc(db, 'users', u.id), { role: 'user' })}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h4>Verified Specialists</h4>
              <div className="admin-card-list">
                {approvedDentists.length === 0 && <p>No verified doctors yet.</p>}
                {approvedDentists.map(u => (
                  <div key={u.id} className="admin-list-item">
                    <div className="doctor-info">
                      <strong>Dr. {u.name}</strong>
                      <span className="doc-meta">{u.specialty} | {u.experience} Years Experience</span>
                    </div>
                    <button className="btn-reject" onClick={() => updateDoc(doc(db, 'users', u.id), { role: 'user' })}>Revoke Access</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab === 'media' && (
            <div className="admin-section">
              <h3>Media Library & Articles</h3>
              
              {procedures.filter(p => p.deletionRequested).length > 0 && (
                <div className="admin-approvals" style={{marginBottom: '30px', background: '#ffeeba', borderColor: '#ffdf7e'}}>
                  <h4 style={{marginTop: 0, color: '#856404'}}>🚨 Pending Deletion Requests</h4>
                  {procedures.filter(p => p.deletionRequested).map(proc => (
                    <div key={proc.id} className="approval-card">
                      <div className="doctor-info">
                        <strong>{proc.title}</strong>
                        <span className="doc-meta">Author: {proc.authorName}</span>
                      </div>
                      <div className="approval-actions">
                        <button className="btn-reject" onClick={() => deleteDoc(doc(db, "procedures", proc.id))}>Approve (Delete)</button>
                        <button className="btn-cancel" onClick={() => updateDoc(doc(db, 'procedures', proc.id), { deletionRequested: false })}>Reject Request</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="admin-form">
                <h4>{editingProcedureId ? 'Edit Media / Topic' : 'Add New Media / Topic'}</h4>
                <select value={newProcedure.category} onChange={e => setNewProcedure({...newProcedure, category: e.target.value})}>
                  <option value="Anatomy">Anatomical Landmark</option>
                  <option value="Disease">Disease / Condition</option>
                  <option value="Treatment">Treatment</option>
                  <option value="Cost">Cost / Economics</option>
                  <option value="Other">Other</option>
                </select>
                <select value={newProcedure.visibility} onChange={e => setNewProcedure({...newProcedure, visibility: e.target.value})} className="visibility-select">
                  <option value="public">Public (Visible to everyone)</option>
                  <option value="dentist-only">Dentists Only (Surgical / Private)</option>
                </select>
                <input type="text" placeholder="Title (e.g., Root Canal)" value={newProcedure.title} onChange={e => setNewProcedure({...newProcedure, title: e.target.value})} />
                <input type="text" placeholder="Short Description for Home Page" value={newProcedure.shortDesc} onChange={e => setNewProcedure({...newProcedure, shortDesc: e.target.value})} />
                <textarea placeholder="Full Article Content (Press Enter for new paragraphs)" value={newProcedure.content} onChange={e => setNewProcedure({...newProcedure, content: e.target.value})} rows="4" />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Upload Images (Select multiple):</label>
                  <input type="file" accept="image/jpeg, image/png, image/webp" multiple onChange={e => setImageFiles(Array.from(e.target.files))} />
                  
                  {newProcedure.imageUrls && newProcedure.imageUrls.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#007bff' }}>
                      Currently editing {newProcedure.imageUrls.length} images.
                    </div>
                  )}

                  <span style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>OR paste an Image URL:</span>
                  <input type="text" placeholder="Image URL" value={newProcedure.imageUrl} onChange={e => setNewProcedure({...newProcedure, imageUrl: e.target.value})} disabled={!!imageFile} />
                </div>

                <input type="text" placeholder="Reference Link (Optional)" value={newProcedure.referenceLink} onChange={e => setNewProcedure({...newProcedure, referenceLink: e.target.value})} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-save" onClick={() => handleAddProcedure()} disabled={isUploading}>
                    {isUploading ? 'Uploading...' : (editingProcedureId ? 'Update Media' : 'Save Media')}
                  </button>
                  {editingProcedureId && (
                    <button className="btn-cancel" onClick={() => { setEditingProcedureId(null); setNewProcedure({ title: '', category: 'Anatomy', shortDesc: '', content: '', imageUrl: '', imageUrls: [], referenceLink: '', visibility: 'public' }); setImageFiles([]); setCurrentPage('home'); }}>Cancel Edit</button>
                  )}
                </div>
              </div>

              <h4 style={{marginTop: '30px'}}>Existing Media</h4>
              <div className="admin-card-list">
                {procedures.map(proc => (
                  <div key={proc.id} className="admin-list-item">
                    <span><strong>{proc.title}</strong> ({proc.category})</span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="btn-edit-proc" style={{ padding: '6px 12px', margin: 0 }} onClick={() => { startEditProcedure(proc); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
                      <button className="btn-delete-proc" style={{ padding: '6px 12px', margin: 0 }} onClick={() => handleDeleteProcedure(proc.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab === 'appearance' && (
            <div className="admin-section">
              <h3>Appearance & Theme</h3>
              <p>Tools to manage site colors, logos, layout widgets, and homepage banners will be located here.</p>
              <div className="appearance-placeholder">
                <button disabled>Customize Theme</button>
                <button disabled>Manage Menus</button>
              </div>
            </div>
          )}

          {adminTab === 'tools' && (
            <div className="admin-section">
              <h3>Tools & Backup</h3>
              <p>Manage your database securely. It is recommended to download a backup before making major changes.</p>
              <div className="tools-container">
                <div className="tool-card">
                  <h4>Export Database Backup</h4>
                  <p>Download a secure ZIP file containing your database and application state.</p>
                  <button className="btn-save" onClick={handleExportBackup}>Download Backup (.zip)</button>
                </div>
                <div className="tool-card">
                  <h4>Restore from Backup</h4>
                  <p>Upload a previously exported ZIP file to restore your database records.</p>
                  <input type="file" accept=".zip" onChange={handleRestoreBackup} className="search-input" />
                </div>
              </div>
            </div>
          )}

          {adminTab === 'reports' && (
            <div className="admin-section">
              <h3>Reported Content</h3>
              <p>Review content flagged by the community for violating platform rules.</p>
              {reports.length === 0 ? <p style={{color: '#8e8e8e'}}>No pending reports.</p> : (
                <div className="admin-card-list">
                  {reports.map(report => (
                    <div key={report.id} className="admin-list-item" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '10px'}}>
                      <div>
                        <strong>{report.type === 'procedure' ? '📄 Post' : '💬 Comment'} Reported</strong>
                        <div style={{fontSize: '13px', color: '#666', marginTop: '4px'}}><strong>Reason:</strong> {report.reason}</div>
                        <div style={{fontSize: '13px', color: '#666'}}><strong>Reported by:</strong> {report.reporterName}</div>
                        <div style={{fontSize: '12px', color: '#8e8e8e', marginTop: '4px'}}>{new Date(report.createdAt).toLocaleString()}</div>
                      </div>
                      <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                        <button className="btn-dashboard" style={{background: '#007bff'}} onClick={() => setCurrentPage(report.targetId)}>View Case</button>
                        <button className="btn-delete-proc" style={{margin: 0}} onClick={async () => {
                          if (report.type === 'procedure') {
                            if(window.confirm("Delete this entire post?")) {
                              await deleteDoc(doc(db, "procedures", report.targetId));
                              await deleteDoc(doc(db, "reports", report.id));
                            }
                          } else {
                            if(window.confirm("Delete this comment?")) {
                              await deleteDoc(doc(db, "procedures", report.targetId, "comments", report.commentId));
                              await deleteDoc(doc(db, "reports", report.id));
                            }
                          }
                        }}>Delete Content</button>
                        <button className="btn-cancel" onClick={() => deleteDoc(doc(db, "reports", report.id))}>Dismiss Report</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- Plugin Admin Panels --- */}
          {registry.renderAdminPanel(adminTab, { user, userProfile, db, allUsers, procedures, setAdminTab })}
        </main>
      </div>
    );
  };

  // --- Profile & Storage Page ---
  const renderProfilePage = () => {
    if (!user) return <div className="error-page">Please log in.</div>;

    const usedMB = ((userProfile?.storageUsed || 0) / (1024 * 1024)).toFixed(2);
    const quotaMB = ((userProfile?.storageQuota || (25 * 1024 * 1024)) / (1024 * 1024)).toFixed(2);
    const progressPercent = Math.min(100, ((userProfile?.storageUsed || 0) / (userProfile?.storageQuota || 1)) * 100);
    const myProcedures = procedures.filter(p => p.authorId === user?.uid);
    const bookmarkedProcs = procedures.filter(p => userProfile?.bookmarkedCases?.includes(p.id));

    const handleRequestQuota = async () => {
      const reason = window.prompt("Briefly explain why you need more storage (e.g., uploading more high-res X-Rays):");
      if (reason) {
        await updateDoc(doc(db, 'users', user.uid), {
            quotaRequested: true,
            quotaReason: reason
        });
        alert("Quota increase requested successfully. An admin will review it shortly.");
      }
    };

    const toggleSelection = (id) => {
      setSelectedForDeletion(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleBulkDeleteRequest = async () => {
      if (!window.confirm(`Request deletion for ${selectedForDeletion.length} selected cases?`)) return;
      for (let id of selectedForDeletion) {
        await updateDoc(doc(db, 'procedures', id), { deletionRequested: true });
      }
      setSelectedForDeletion([]);
      alert("Deletion request successfully bundled and sent to the administrator.");
    };

    return (
      <div className="profile-page">
        <button className="back-button" onClick={() => setCurrentPage('home')}>&larr; Back to Home</button>
        
        <div className="profile-header-card">
          {isEditingProfile ? (
            <div className="edit-profile-form">
               <div className="file-upload-box" style={{marginBottom: '15px'}}>
                 <label>Change Profile Picture:</label>
                 <input type="file" accept="image/*" onChange={e => setEditProfilePicFile(e.target.files[0])} />
               </div>
               <textarea placeholder="Write a short bio about your experience or conditions..." value={editBio} onChange={e => setEditBio(e.target.value)} rows="3" style={{width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box'}} />
               <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                  <button className="btn-save" onClick={handleSaveProfile} disabled={isSavingProfile}>{isSavingProfile ? 'Saving...' : 'Save Profile'}</button>
                  <button className="btn-cancel" onClick={() => setIsEditingProfile(false)}>Cancel</button>
               </div>
            </div>
          ) : (
            <div className="profile-info-display">
               <div className="profile-avatar-large">
                  {userProfile?.profilePic ? <img src={userProfile.profilePic} alt="Profile" /> : userProfile?.name?.[0]?.toUpperCase()}
               </div>
               <div className="profile-details">
                  <h2>{userProfile?.name} {userProfile?.role === 'dentist' && '🦷'}</h2>
                  <p className="profile-role">{userProfile?.role === 'admin' ? 'Administrator' : userProfile?.role === 'dentist' ? userProfile?.specialty || 'Specialist' : 'User'}</p>
                  <p className="profile-bio">{userProfile?.bio || "No bio added yet."}</p>
                  <button className="btn-edit-proc" style={{margin: '10px 0 0 0', padding: '6px 12px'}} onClick={() => { setIsEditingProfile(true); setEditBio(userProfile?.bio || ''); setEditProfilePicFile(null); }}>Edit Profile</button>
               </div>
            </div>
          )}
        </div>
        
        <div className="storage-card">
          <h3>Storage Usage</h3>
          <p>{usedMB} MB used of {quotaMB} MB</p>
          <div className="storage-bar-bg">
            <div className={`storage-bar-fill ${progressPercent > 90 ? 'danger' : ''}`} style={{width: `${progressPercent}%`}}></div>
          </div>
        </div>
        
        <div className="storage-card">
          <h3>My Network</h3>
          <p>Following: <strong>{userProfile?.following?.length || 0}</strong> Specialists/Users</p>
        </div>

        {!userProfile?.quotaRequested ? (
          <div className="upgrade-card buy-card">
            <h3>📈 Request Storage Quota Increase</h3>
            <p>If you're out of space, you can request additional free storage from the administration team.</p>
            <p className="rate-text"><em>Note: Accounts with high-quality, authentic clinical cases are prioritized for upgrades.</em></p>
            <button className="btn-save" style={{marginTop: '10px'}} onClick={handleRequestQuota}>Request Increase</button>
          </div>
        ) : (
          <div className="upgrade-card freemium-card">
            <h3>⏳ Request Pending</h3>
            <p>Your request for a storage increase is currently under review by the administration team.</p>
            <p className="rate-text"><strong>Reason provided:</strong> <em>{userProfile?.quotaReason}</em></p>
          </div>
        )}

        <div className="upgrade-card">
          <h3>⭐ Saved Cases</h3>
          <p>Access your bookmarked queries and clinical cases here.</p>
          {bookmarkedProcs.length === 0 ? <p className="rate-text">You haven't saved any cases yet.</p> : (
            <div className="explore-grid" style={{marginTop: '15px'}}>
              {bookmarkedProcs.map(proc => (
                <div key={proc.id} className="explore-item" onClick={() => setCurrentPage(proc.id)}>
                  <img src={proc.imageUrl} alt={proc.title} loading="lazy" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="upgrade-card">
          <h3>📁 Manage My Submissions</h3>
          <p>Select cases to bundle into a deletion request to the admin.</p>
          {myProcedures.length === 0 ? <p className="rate-text">You have not submitted any cases yet.</p> : (
            <div className="explore-grid" style={{marginTop: '15px'}}>
              {myProcedures.map(proc => (
                <div key={proc.id} className={`explore-item ${selectedForDeletion.includes(proc.id) ? 'selected-delete' : ''}`} onClick={() => toggleSelection(proc.id)}>
                  <img src={proc.imageUrl} alt={proc.title} loading="lazy" />
                  {proc.deletionRequested && <span className="explore-badge">Pending Deletion</span>}
                </div>
              ))}
              {selectedForDeletion.length > 0 && (
                <button className="btn-delete-proc" style={{marginTop: '15px', gridColumn: '1 / -1'}} onClick={handleBulkDeleteRequest}>Request Deletion for Selected</button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Search & Explore Page ---
  const renderSearchPage = () => {
    const uniqueSpecialties = [...new Set(allUsers.filter(u => u.role === 'dentist' && u.specialty).map(u => u.specialty))];
    const filteredProcedures = procedures.filter(proc => {
      const matchesSearch = proc.title.toLowerCase().includes(searchQuery.toLowerCase()) || proc.shortDesc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'All' || proc.category === filterCategory;
      const author = allUsers.find(u => u.id === proc.authorId);
      const matchesSpecialty = filterSpecialty === 'All' || (author && author.specialty === filterSpecialty);
      const isDentistOnly = proc.visibility === 'dentist-only';
      const canView = !isDentistOnly || (userProfile?.role === 'admin' || userProfile?.role === 'dentist');
      return matchesSearch && matchesCategory && matchesSpecialty && canView;
    });

    return (
      <div className="search-page">
        <div className="search-filter-container">
          <input type="text" placeholder="Search conditions, landmarks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
          <div className="filter-group">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="filter-select">
              <option value="All">All Categories</option>
              <option value="Patient Query">Patient Queries</option>
              <option value="Disease">Disease / Condition</option>
              <option value="Treatment">Treatment</option>
              <option value="Anatomy">Anatomical Landmark</option>
              <option value="Other">Other</option>
            </select>
            {uniqueSpecialties.length > 0 && (
              <select value={filterSpecialty} onChange={(e) => setFilterSpecialty(e.target.value)} className="filter-select">
                <option value="All">All Specialties</option>
                {uniqueSpecialties.map(spec => <option key={spec} value={spec}>{spec}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="explore-grid">
          {filteredProcedures.slice(0, visibleCount).map(proc => (
            <div key={proc.id} className="explore-item" onClick={() => setCurrentPage(proc.id)}>
              {proc.imageUrls && proc.imageUrls.length > 1 && <span className="carousel-icon-badge">📑</span>}
              <img src={(proc.imageUrls && proc.imageUrls[0]) || proc.imageUrl} alt={proc.title} loading="lazy" />
              {proc.visibility === 'dentist-only' && <span className="explore-badge">🦷</span>}
            </div>
          ))}
        </div>
        {visibleCount < filteredProcedures.length && (
          <div ref={lastElementRef} style={{ textAlign: 'center', padding: '20px', color: '#8e8e8e' }}>
            Loading more...
          </div>
        )}
      </div>
    );
  };

  // --- Upload / New Post Page ---
  const renderUploadPage = () => {
    if (!user) return <div className="error-page">Please log in to upload.</div>;
    return (
      <div className="upload-page">
        <div className="admin-form">
          <h3>{editingProcedureId ? 'Edit Case / Question' : 'New Post / Ask a Question'}</h3>
          <input type="text" placeholder="Primary question or title..." value={newProcedure.title} onChange={e => setNewProcedure({...newProcedure, title: e.target.value})} />
          <input type="text" placeholder="Brief summary (e.g. 32M, pain in lower left molar)" value={newProcedure.shortDesc} onChange={e => setNewProcedure({...newProcedure, shortDesc: e.target.value})} />
          <textarea placeholder="Provide detailed background, symptoms, or clinical notes..." value={newProcedure.content} onChange={e => setNewProcedure({...newProcedure, content: e.target.value})} rows="5" />
          <div className="file-upload-box">
            <label className="btn-save" style={{cursor: 'pointer', display: 'inline-block', background: '#6c757d'}}>
              📷 Select Images
              <input type="file" accept="image/*" multiple style={{display: 'none'}} onChange={e => setImageFiles(prev => [...prev, ...Array.from(e.target.files)])} />
            </label>
            {newProcedure.imageUrls && newProcedure.imageUrls.length > 0 && (
              <div style={{ fontSize: '12px', color: '#007bff', marginTop: '5px' }}>
                Editing post with {newProcedure.imageUrls.length} existing images. Selecting new files will append them.
              </div>
            )}
            {imageFiles.length > 0 && (
              <div className="image-previews-container">
                {imageFiles.map((file, idx) => (
                  <div key={idx} className="image-preview-card">
                    <img src={URL.createObjectURL(file)} alt="preview" />
                    <div className="preview-actions">
                      <button onClick={(e) => { e.preventDefault(); openEditor(file, idx, 'procedure'); }}>✏️ Edit</button>
                      <button onClick={(e) => { e.preventDefault(); setImageFiles(prev => prev.filter((_, i) => i !== idx)); }}>✖</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Poll Builder Section */}
            <div className="poll-builder-section" style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #dbdbdb', marginTop: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                <input type="checkbox" checked={newProcedure.hasPoll} onChange={e => setNewProcedure({...newProcedure, hasPoll: e.target.checked})} />
                📊 Add a Diagnostic Poll (Multiple Choice)
              </label>
              {newProcedure.hasPoll && (
                <div className="poll-builder-inputs" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input type="text" placeholder="Poll Question (e.g., What is your diagnosis?)" value={newProcedure.pollQuestion} onChange={e => setNewProcedure({...newProcedure, pollQuestion: e.target.value})} />
                  {newProcedure.pollOptions.map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '5px' }}>
                      <input type="text" placeholder={`Option ${idx + 1}`} value={opt} onChange={e => {
                        const newOpts = [...newProcedure.pollOptions];
                        newOpts[idx] = e.target.value;
                        setNewProcedure({...newProcedure, pollOptions: newOpts});
                      }} style={{ flex: 1 }} />
                      {newProcedure.pollOptions.length > 2 && (
                        <button className="btn-cancel" onClick={() => {
                          const newOpts = newProcedure.pollOptions.filter((_, i) => i !== idx);
                          setNewProcedure({...newProcedure, pollOptions: newOpts});
                        }} style={{padding: '0 10px'}}>✖</button>
                      )}
                    </div>
                  ))}
                  {newProcedure.pollOptions.length < 4 && (
                    <button className="btn-save" style={{ background: '#f1f1f1', color: '#333' }} onClick={() => setNewProcedure({...newProcedure, pollOptions: [...newProcedure.pollOptions, '']})}>+ Add Option</button>
                  )}
                </div>
              )}
            </div>
            
            <div className="consent-box">
              <input type="checkbox" id="consentCheck" checked={patientConsent} onChange={e => setPatientConsent(e.target.checked)} />
              <label htmlFor="consentCheck">
                <strong>Mandatory Patient Consent:</strong> I confirm I have removed all Protected Health Information (PHI) and have patient consent to share this case for educational purposes.
              </label>
            </div>
            
          </div>
          <div className="form-actions">
            <button className="btn-save" onClick={() => handleAddProcedure({ category: 'Patient Query' })} disabled={isUploading || !patientConsent}>
              {isUploading ? 'Uploading...' : (editingProcedureId ? 'Update Post' : 'Share Post')}
            </button>
            <button className="btn-cancel" onClick={() => { setEditingProcedureId(null); setNewProcedure({ title: '', category: 'Anatomy', shortDesc: '', content: '', imageUrl: '', imageUrls: [], referenceLink: '', visibility: 'public', hasPoll: false, pollQuestion: '', pollOptions: ['', ''], isResolved: false }); setImageFiles([]); setPatientConsent(false); setCurrentPage('home'); }}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  // --- Activity & Notifications Page ---
  const renderActivityPage = () => {
    if (!user) return <div className="error-page">Please log in to see activity.</div>;
    return (
      <div className="activity-page">
        <h2 style={{padding: '20px', borderBottom: '1px solid #dbdbdb', margin: 0}}>Activity & Notifications</h2>
        {notifications.length === 0 ? (
          <div style={{padding: '40px 20px', textAlign: 'center', color: '#8e8e8e'}}>
            <div style={{fontSize: '40px', marginBottom: '10px'}}>🔔</div>
            <p>No notifications yet.</p>
            <p>When someone likes or comments on your case, it will show up here.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map(notif => (
              <div key={notif.id} className={`notif-item ${!notif.read ? 'unread' : ''}`} onClick={() => { updateDoc(doc(db, 'users', user.uid, 'notifications', notif.id), { read: true }); if (notif.linkId !== 'profile') setCurrentPage(notif.linkId); }}>
                <div className="notif-avatar">
                  {(() => {
                    const actorDoc = allUsers.find(u => u.id === notif.actorId);
                    return actorDoc?.profilePic ? <img src={actorDoc.profilePic} className="avatar-img" alt="" /> : (notif.actorName?.[0]?.toUpperCase() || '?');
                  })()}
                </div>
                <div className="notif-content">
                  <span><strong>{notif.actorName}</strong> {notif.message}</span>
                  <span className="notif-time">{new Date(notif.createdAt).toLocaleDateString()}</span>
                </div>
                {!notif.read && <div className="notif-unread-dot"></div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // --- Direct Messaging Pages ---
  const renderInboxPage = () => {
    if (!user) return <div className="error-page">Please log in to view your messages.</div>;
    return (
      <div className="inbox-page">
        <h2 style={{padding: '20px', margin: 0, borderBottom: '1px solid #dbdbdb'}}>Direct Messages</h2>
        {chats.length === 0 ? (
          <div style={{padding: '40px', textAlign: 'center', color: '#8e8e8e'}}>No messages yet. Start a chat from someone's post!</div>
        ) : (
          <div className="chat-list">
            {chats.map(chat => {
              const otherUserId = chat.participants.find(id => id !== user.uid);
              const otherUserName = chat.participantNames?.[otherUserId] || 'Unknown User';
              return (
                <div key={chat.id} className="chat-list-item" onClick={() => { setActiveChat(chat); setCurrentPage('chat'); }}>
                  <div className="post-avatar">
                    {otherUserDoc?.profilePic ? <img src={otherUserDoc.profilePic} className="avatar-img" alt="" /> : otherUserName[0].toUpperCase()}
                  </div>
                  <div className="chat-list-info">
                    <strong>{otherUserName} {userProfile?.blockedUsers?.includes(otherUserId) && <span style={{color: '#dc3545', fontSize: '12px', marginLeft: '5px'}}>(Blocked)</span>}</strong>
                    <span className="chat-list-lastmsg">{chat.lastMessage || 'New chat started...'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderChatPage = () => {
    if (!user || !activeChat) return <div className="error-page">Chat not found.</div>;
    const otherUserId = activeChat.participants.find(id => id !== user.uid);
    const otherUserName = activeChat.participantNames?.[otherUserId] || 'User';
    const otherUserDoc = allUsers.find(u => u.id === otherUserId);
    
    const iBlockedThem = userProfile?.blockedUsers?.includes(otherUserId);
    const theyBlockedMe = otherUserDoc?.blockedUsers?.includes(user.uid);

    return (
      <div className="chat-page">
        <div className="chat-header">
          <button className="action-btn" onClick={() => setCurrentPage('inbox')}>&larr;</button>
          <strong>{otherUserName}</strong>
          <button className="btn-delete-proc" style={{margin: 0, padding: '4px 8px'}} onClick={() => handleToggleBlock(otherUserId)}>
            {iBlockedThem ? 'Unblock' : 'Block'}
          </button>
        </div>
        <div className="chat-messages">
          {chatMessages.map(msg => (
            <div key={msg.id} className={`chat-bubble-row ${msg.senderId === user.uid ? 'me' : 'them'}`}>
              <div className="chat-bubble">
                {msg.imageUrl && <img src={msg.imageUrl} alt="Attachment" className="chat-attached-image" />}
                {msg.text && <div>{msg.text}</div>}
                {msg.caseId && (
                  <button className="btn-dashboard" style={{background: '#28a745', marginTop: '8px', padding: '6px 10px', fontSize: '13px', width: '100%'}} onClick={() => setCurrentPage(msg.caseId)}>View Case &rarr;</button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {iBlockedThem ? (
          <div className="chat-input-area" style={{justifyContent: 'center', color: '#8e8e8e', fontStyle: 'italic'}}>
            You have blocked this user.
          </div>
        ) : theyBlockedMe ? (
          <div className="chat-input-area" style={{justifyContent: 'center', color: '#8e8e8e', fontStyle: 'italic'}}>
            You cannot reply to this conversation.
          </div>
        ) : (
          <div className="chat-input-area">
            {chatImageFile && (
              <div className="chat-image-preview">
                <img src={URL.createObjectURL(chatImageFile)} alt="preview" />
                <button onClick={() => openEditor(chatImageFile, null, 'chat')}>✏️</button>
                <button onClick={() => setChatImageFile(null)}>✖</button>
              </div>
            )}
            <label className="chat-upload-btn">
              📷
              <input type="file" accept="image/*" style={{display: 'none'}} onChange={e => setChatImageFile(e.target.files[0])} disabled={isSendingChatImage} />
            </label>
            <input type="text" placeholder="Message..." value={newChatMessage} onChange={e => setNewChatMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} disabled={isSendingChatImage} />
            <button className="btn-save" onClick={handleSendMessage} disabled={isSendingChatImage}>{isSendingChatImage ? '...' : 'Send'}</button>
          </div>
        )}
      </div>
    );
  };

  // --- Support & Features Guide Page ---
  const renderSupportPage = () => {

    const supportTopics = [
      { 
        id: 't1', title: 'Submit a Clinical Case', 
        description: 'Upload single or multiple X-rays and clinical photos. Includes mandatory patient consent, diagnostic polls, and privacy blurring tools.', 
        link: 'upload', linkText: 'Go to Upload',
        detailedSteps: [
          "Tap the '➕' icon in the bottom navigation bar.",
          "Fill in your primary question and a brief summary of the patient's symptoms.",
          "Tap '📷 Select Images' to choose photos from your device. You can select multiple images to create a swipeable carousel.",
          "Optional: Tap '✏️ Edit' on an image preview to blur faces or annotate areas of interest.",
          "Check the 'Mandatory Patient Consent' box to confirm privacy compliance.",
          "Tap 'Share Post' to publish your case to the community."
        ]
      },
      { 
        id: 't2', title: 'Image Privacy Editor', 
        description: 'Before submitting, use our built-in image editor to crop out margins, redact text, or blur identifying patient marks for HIPAA compliance.',
        detailedSteps: [
          "Start a new case or open a direct message chat.",
          "Select an image to upload so the preview thumbnail appears.",
          "Tap the '✏️ Edit' button overlaid on the image preview.",
          "To blur an area: Select the 'Filters' tab and apply a blur effect.",
          "To draw or redact: Select the 'Annotate' tab and use the pen or shapes.",
          "Tap 'Save' in the editor. The image is securely updated before ever leaving your device."
        ]
      },
      { 
        id: 't3', title: 'Diagnostic Polls', 
        description: 'Attach multiple-choice questions to your case to gamify learning and gather consensus from the community.',
        detailedSteps: [
          "Navigate to the '➕' upload screen to create a new case.",
          "Scroll down and check the '📊 Add a Diagnostic Poll (Multiple Choice)' box.",
          "Type your poll question (e.g., 'What is your probable diagnosis?').",
          "Fill in at least two options (e.g., 'Caries', 'Root Fracture'). Tap '+ Add Option' if you need more.",
          "Publish your post. The community can now click to vote, and the results will display as a progress bar chart!"
        ]
      },
      { 
        id: 't4', title: 'Interactive Anatomy Landmarks', 
        description: 'Click anywhere on an uploaded case image to drop a pin. Add associated diseases, specialists, and treatments.',
        detailedSteps: [
          "Open any existing clinical case from the home feed.",
          "Tap directly on the area of interest on the main image.",
          "A form will pop up. Enter the structure name, associated diseases, and possible treatments.",
          "Tap 'Save'. A clickable orange dot will appear on the image (green if approved by Admin).",
          "Other users can click the dot to read the information you provided."
        ]
      },
      { 
        id: 't5', title: 'Direct Messaging & Consultations', 
        description: 'Send private 1-on-1 messages to other users and specialists. You can attach images directly in the chat or share public cases to a DM.', 
        link: 'inbox', linkText: 'Open Inbox',
        detailedSteps: [
          "To start a new chat, tap '📩 Message' on any user's post or profile.",
          "To access your ongoing conversations, tap the 📩 icon in the top navigation bar.",
          "Inside a chat, type a message or tap the 📷 button to attach private images or X-rays.",
          "You can also use the 📤 Share button on public cases to forward them directly into a private chat."
        ]
      },
      { 
        id: 't6', title: 'Mute & Block Users', 
        description: 'Control your experience. Block users from your inbox to prevent them from sending DMs or triggering notifications.',
        detailedSteps: [
          "Open your Direct Messages Inbox (📩) and click on the chat with the user you want to block.",
          "In the top right corner of the chat window, tap the 'Block' button.",
          "The user will immediately be blocked. The input box will disappear, and they cannot send you notifications or messages.",
          "To unblock them, return to the chat and tap 'Unblock'."
        ]
      },
      { 
        id: 't7', title: 'Specialist Verification', 
        description: 'Dental professionals can apply for a "Verified Dentist" badge. Verified accounts receive increased storage quotas and access to Dentist-Only cases.', 
        link: 'profile', linkText: 'Apply in Profile',
        detailedSteps: [
          "Tap the '👤 Profile' icon in the bottom navigation bar.",
          "Tap the 'Apply for Dentist Account' button.",
          "Enter your official Registration Number, your Specialty, and your years of Experience.",
          "Tap 'Submit'. Your application will be sent to the administration.",
          "Once approved, your quota increases to 250 MB and you receive a 🦷 Specialist badge!"
        ]
      },
      { 
        id: 't8', title: 'Dark Mode', 
        description: 'Toggle the 🌙/☀️ icon in the top navigation bar to switch to a low-contrast dark theme, perfect for viewing X-rays in dark radiology rooms.',
        detailedSteps: [
          "Look at the top right of your screen (in the top navigation bar).",
          "Tap the 🌙 (moon) icon to instantly switch the entire app to Dark Mode.",
          "The app will remember your preference automatically next time you visit.",
          "Tap the ☀️ (sun) icon to switch back to Light Mode."
        ]
      },
      { 
        id: 't9', title: 'Save & Bookmark Cases', 
        description: 'Click the 🔖 icon on any case to save it for later. You can quickly access all your saved cases from your profile.', 
        link: 'profile', linkText: 'View Saved Cases',
        detailedSteps: [
          "While browsing the home feed or reading an article, tap the 🔖 (bookmark) icon on any case.",
          "The icon will turn yellow to indicate it has been saved.",
          "To view your saved cases, navigate to your '👤 Profile'.",
          "Scroll down to the '⭐ Saved Cases' section to quickly revisit them."
        ]
      },
      { 
        id: 't10', title: 'Mark as Resolved', 
        description: 'Authors can mark their own cases as "Resolved" once a definitive diagnosis or treatment outcome is reached, adding a green badge to the post.',
        detailedSteps: [
          "Open a case that you have previously uploaded.",
          "Scroll all the way to the bottom of the article, past the comments.",
          "Tap the '✅ Mark as Resolved' button.",
          "A green 'Resolved' badge will be permanently attached to your post so other users know the case has a verified conclusion."
        ]
      },
      { 
        id: 't11', title: 'Content Moderation & Reporting', 
        description: 'Help keep the community safe. Use the 🚩 icon on posts or comments to report inappropriate content or privacy violations to the admin.',
        detailedSteps: [
          "If you spot inappropriate content or an unredacted patient name, tap the 🚩 flag icon on the post or comment.",
          "A prompt will appear asking for a reason.",
          "Type a brief reason (e.g., 'Patient name is visible on the X-Ray') and submit.",
          "The Admin will review the report in their dedicated dashboard and either remove the content or dismiss the flag."
        ]
      },
      { 
        id: 't12', title: 'Storage Quotas & Upgrades', 
        description: 'Track your image upload storage in your profile. If you run out of space, you can request a free quota increase from the administration.', 
        link: 'profile', linkText: 'Check Storage',
        detailedSteps: [
          "Tap the '👤 Profile' icon in the bottom navigation.",
          "Check the 'Storage Usage' progress bar to see how much of your quota you have used.",
          "If you are running out of space, scroll down to 'Request Storage Quota Increase'.",
          "Tap 'Request Increase' and provide a brief reason. The admin will review and upgrade your account."
        ]
      },
      { 
        id: 't13', title: 'Install App (PWA)', 
        description: 'For the best mobile experience, click the "📲 Install" button in the top navigation bar to add DentalGuide directly to your home screen.',
        detailedSteps: [
          "Open the website in a compatible browser like Chrome (Android/Desktop) or Safari (iOS).",
          "Look for the blue '📲 Install' button in the top navigation bar.",
          "Tap it and follow your device's prompt to 'Add to Home Screen'.",
          "The app will now launch in full-screen mode like a native mobile app!"
        ]
      }
    ];

    const filteredTopics = supportTopics.filter(t => 
      t.title.toLowerCase().includes(supportSearch.toLowerCase()) || 
      t.description.toLowerCase().includes(supportSearch.toLowerCase())
    );

    if (selectedSupportTopic) {
      return (
        <div className="support-page article-page">
          <button className="back-button" onClick={() => setSelectedSupportTopic(null)}>&larr; Back to Features List</button>
          <h2>{selectedSupportTopic.title}</h2>
          <p className="support-detail-desc">{selectedSupportTopic.description}</p>
          
          <div className="support-steps-container">
            <h3 style={{marginTop: 0, marginBottom: '15px'}}>Step-by-Step Guide</h3>
            <ol className="support-steps">
              {selectedSupportTopic.detailedSteps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>

          {selectedSupportTopic.link && (
            <button className="btn-dashboard" style={{background: '#28a745', marginTop: '25px', padding: '10px 20px', fontSize: '16px'}} onClick={() => { setSelectedSupportTopic(null); setCurrentPage(selectedSupportTopic.link); }}>
              {selectedSupportTopic.linkText}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="support-page article-page">
        <h2>Support & Features Guide</h2>
        <p style={{color: '#666', marginBottom: '20px'}}>Welcome to the Help Center! Browse the quick summaries below. If you need a complete walk-through, tap <strong>"📖 Read Detailed Guide"</strong> on any topic.</p>
        
        <input type="text" placeholder="Search features or tools..." value={supportSearch} onChange={e => setSupportSearch(e.target.value)} className="search-input" style={{marginBottom: '20px'}} />
        
        <div className="support-grid">
          {filteredTopics.length === 0 && <p style={{textAlign: 'center', color: '#888'}}>No features found matching your search.</p>}
          {filteredTopics.map(t => (
            <div key={t.id} className="support-card">
              <h4>{t.title}</h4>
              <p>{t.description}</p>
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <button className="btn-dashboard" style={{background: '#007bff'}} onClick={() => setSelectedSupportTopic(t)}>📖 Read Detailed Guide</button>
                {t.link && <button className="btn-dashboard" style={{background: '#6c757d'}} onClick={() => setCurrentPage(t.link)}>{t.linkText}</button>}
              </div>
            </div>
          ))}
        </div>
        <button className="back-button" style={{marginTop: '30px'}} onClick={() => setCurrentPage('home')}>&larr; Back to Home</button>
      </div>
    );
  };

  const renderPage = () => {
    if (currentPage === 'admin-dashboard') return renderAdminDashboard();
    if (currentPage === 'support') return renderSupportPage();
    if (currentPage === 'profile') return renderProfilePage();
    if (currentPage === 'search') return renderSearchPage();
    if (currentPage === 'upload') return renderUploadPage();
    if (currentPage === 'activity') return renderActivityPage();
    if (currentPage === 'inbox') return renderInboxPage();
    if (currentPage === 'chat') return renderChatPage();

    if (currentPage === 'privacy-policy') {
      return (
        <div className="legal-page">
          <h2>Privacy Policy</h2>
          <p>Effective Date: April 2026</p>
          <p>Welcome to the Dental Interactive Guide. Your privacy is important to us. This privacy policy explains how we collect, use, and protect your personal information when you use our platform and mobile applications.</p>
          <h3>1. Information We Collect</h3>
          <p>We may collect personal information such as your name, email address, and professional credentials (if applying for a dentist account) when you sign up using Google Authentication.</p>
          <h3>2. How We Use Your Information</h3>
          <p>Your information is used to authenticate your access, verify medical professionals, and ensure a safe environment for sharing clinical cases. We do not sell your personal data to third parties.</p>
          <h3>3. Data Security</h3>
          <p>We implement industry-standard security measures, leveraging Google Firebase services, to protect your data from unauthorized access or disclosure.</p>
          <button className="back-button" onClick={() => setCurrentPage('home')}>&larr; Back to Home</button>
        </div>
      );
    }

    if (currentPage === 'terms-conditions') {
      return (
        <div className="legal-page">
          <h2>Terms & Conditions</h2>
          <p>Effective Date: April 2026</p>
          <p>By accessing or using the Dental Interactive Guide, you agree to be bound by these terms and conditions.</p>
          <h3>1. Professional Advice Disclaimer</h3>
          <p>The content provided on this platform is for informational and educational purposes only. It is not a substitute for professional medical or dental advice, diagnosis, or treatment.</p>
          <h3>2. User Conduct</h3>
          <p>Users agree to interact respectfully. Clinical images shared must comply with patient privacy laws (e.g., HIPAA) and must not contain identifiable patient information without consent.</p>
          <h3>3. Account Termination</h3>
          <p>We reserve the right to suspend or terminate accounts that violate these terms, including the posting of inappropriate content or misrepresentation of credentials.</p>
          <button className="back-button" onClick={() => setCurrentPage('home')}>&larr; Back to Home</button>
        </div>
      );
    }

    // --- Check if any Plugin handles this page route ---
    const PluginPage = registry.renderPages(currentPage, { setCurrentPage, user, userProfile, db });
    if (PluginPage) return PluginPage;

    if (currentPage === 'home') {
      // Home feed only filters visibility
      const filteredProcedures = procedures.filter(proc => !proc.visibility || proc.visibility !== 'dentist-only' || (userProfile?.role === 'admin' || userProfile?.role === 'dentist'));

      const displayedProcedures = filteredProcedures.slice(0, visibleCount);

      return (
        <div className="home-page">
          
          {/* --- Plugin Homepage Widgets --- */}
          <div className="plugin-widgets-container" style={{maxWidth: '800px', margin: '0 auto'}}>
            {registry.renderHomeWidgets({ setCurrentPage, user, userProfile })}
          </div>

          <div className="insta-feed">
            {filteredProcedures.length === 0 && (
              <p style={{textAlign: 'center', width: '100%'}}>No cases or media found. Be the first to submit one!</p>
            )}
            {displayedProcedures.map((proc) => {
              const images = proc.imageUrls && proc.imageUrls.length > 0 ? proc.imageUrls : (proc.imageUrl ? [proc.imageUrl] : []);
              return (
              <article className="insta-post" key={proc.id}>
                <div className="post-header" onClick={() => setCurrentPage(proc.id)}>
                  <div className="post-avatar">
                    {(() => {
                      const author = allUsers.find(u => u.id === proc.authorId);
                      return author?.profilePic ? <img src={author.profilePic} className="avatar-img" alt="" /> : (proc.authorName || '?')[0].toUpperCase();
                    })()}
                  </div>
                  <div className="post-author-info">
                    <span className="post-author-name">{proc.authorName}</span>
                    <span className="post-author-role">{proc.authorRole === 'dentist' ? 'Specialist' : 'User'}</span>
                  </div>
                  {proc.isResolved && <span className="resolved-badge">✅ Resolved</span>}
                  <div style={{marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center'}}>
                    {user && proc.authorId !== user.uid && (
                      <>
                        <button className="btn-follow" style={{background: '#efefef', color: '#262626'}} onClick={(e) => { e.stopPropagation(); startChat(proc.authorId, proc.authorName); }}>📩 Message</button>
                      <button className={`btn-follow ${userProfile?.following?.includes(proc.authorId) ? 'following' : ''}`} onClick={(e) => { e.stopPropagation(); handleToggleFollow(proc.authorId); }}>
                        {userProfile?.following?.includes(proc.authorId) ? 'Following' : 'Follow'}
                      </button>
                      </>
                    )}
                    {proc.visibility === 'dentist-only' && <span className="post-visibility-badge" style={{margin: 0}}>🦷</span>}
                  </div>
                </div>
                <div className="post-image-wrapper" onDoubleClick={(e) => { e.stopPropagation(); handleDoubleTap(proc); }}>
                  <div className="carousel-container">
                    {images.map((url, idx) => (
                      <div key={idx} className="carousel-slide">
                        <img src={url} alt={`${proc.title} - ${idx+1}`} className="post-image" loading="lazy" />
                      </div>
                    ))}
                  </div>
                  {images.length > 1 && <div className="carousel-dots"><div className="carousel-dot active"></div><div className="carousel-dot"></div></div>}
                  <div className={`heart-overlay ${showHeartMap[proc.id] ? 'animate' : ''}`}>❤️</div>
                </div>
                <div className="post-actions">
                  <button className={`action-btn ${proc.likes?.includes(user?.uid) ? 'liked' : ''}`} onClick={() => handleToggleLike(proc)}>
                    {proc.likes?.includes(user?.uid) ? '❤️' : '🤍'}
                  </button>
                  <button className="action-btn" onClick={() => setCurrentPage(proc.id)}>💬</button>
                  <button className="action-btn" onClick={() => user ? setShowShareModal(proc) : setShowLoginModal(true)}>📤</button>
                  <button className={`action-btn ${userProfile?.bookmarkedCases?.includes(proc.id) ? 'saved' : ''}`} onClick={(e) => handleToggleBookmark(proc.id, e)}>
                    {userProfile?.bookmarkedCases?.includes(proc.id) ? '🔖' : '📑'}
                  </button>
                  <button className="action-btn" style={{marginLeft: 'auto'}} onClick={() => handleReport('procedure', proc.id)} title="Report">🚩</button>
                </div>
                <div className="post-stats">
                  {proc.likes?.length || 0} likes • {proc.views || 0} views
                </div>
                <div className="post-caption">
                  <strong>{proc.authorName}</strong> {proc.title}
                  <div className="post-desc">{proc.shortDesc}</div>
                  {renderPoll(proc)}
                  <div className="post-view-comments" onClick={() => setCurrentPage(proc.id)}>View all comments & landmarks...</div>
                </div>
              </article>
            )})}
          </div>
          
          {visibleCount < filteredProcedures.length && (
            <div ref={lastElementRef} style={{ textAlign: 'center', padding: '20px', color: '#8e8e8e' }}>
              Loading more cases...
            </div>
          )}
        </div>
      );
    }

    // Dynamic Article Page Rendering
    const currentProc = procedures.find(p => p.id === currentPage);
    const isAppCopyright = currentProc?.authorRole === 'admin' || currentProc?.authorRole === 'dentist';
    const images = currentProc?.imageUrls && currentProc.imageUrls.length > 0 ? currentProc.imageUrls : (currentProc?.imageUrl ? [currentProc.imageUrl] : []);
    
    if (currentProc) {
      return (
        <div className="article-page">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": isAppCopyright ? "MedicalWebPage" : "WebPageElement",
            "name": currentProc.title,
            "author": { "@type": "Person", "name": currentProc.authorName },
            "copyrightHolder": isAppCopyright ? { "@type": "Organization", "name": "Dental Interactive Guide" } : undefined,
            "isAccessibleForFree": true
          }) }} />
          
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px'}}>
            <button className="back-button" onClick={() => setCurrentPage('home')} style={{marginBottom: 0}}>&larr; Back to Home</button>
            <div style={{display: 'flex', gap: '10px'}}>
              <button 
                className="btn-bookmark"
                onClick={() => handleReport('procedure', currentProc.id)}
              >
                🚩 Report
              </button>
              <button 
                className="btn-bookmark"
                onClick={() => user ? setShowShareModal(currentProc) : setShowLoginModal(true)}
              >
                📤 Share
              </button>
              <button 
                className={`btn-bookmark ${userProfile?.bookmarkedCases?.includes(currentProc.id) ? 'active' : ''}`}
                onClick={() => handleToggleBookmark(currentProc.id)}
              >
                {userProfile?.bookmarkedCases?.includes(currentProc.id) ? '★ Saved' : '☆ Save Case'}
              </button>
            </div>
          </div>
          <h2>{currentProc.title} {currentProc.isResolved && <span className="resolved-badge">✅ Resolved</span>}</h2>
          <div className="article-meta" style={{marginBottom: '20px'}}>
            <span className="card-category">{currentProc.category || 'Article'}</span>
            <span className="seo-author-badge">{isAppCopyright ? `© ${new Date().getFullYear()} Dental Interactive Guide (Verified Content)` : 'User Generated Content'}</span>
          </div>
          <div className="article-content">
            
            {/* Split content by line breaks so it formats paragraphs nicely */}
            {currentProc.content.split('\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
            
            {renderPoll(currentProc)}
            
            {/* Interactive Image Container */}
            <div className="carousel-container" style={{margin: '20px 0', borderRadius: '8px'}}>
              {images.map((url, idx) => (
                <div key={idx} className="carousel-slide">
                  <div className="interactive-image-container" onClick={handleImageClick} style={{margin:0, width:'100%'}}>
                    <img 
                      src={url} 
                      alt={currentProc.title} 
                      className="article-image interactive-img" 
                      style={{margin:0}}
                    />
                    
                    {/* Render Landmarks */}
                    {landmarks
                      .filter(lm => lm.imageId === currentProc.id) // In a future update, we can tie landmarks to specific index!
                      .map((lm) => (
                      <div 
                        key={lm.id} 
                        className={`landmark-marker ${lm.status}`} 
                        style={{ left: `${lm.x}%`, top: `${lm.y}%` }}
                      >
                        <span 
                          className="landmark-dot"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTooltip(activeTooltip === lm.id ? null : lm.id);
                            setActiveContextMenu(null);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault(); // Prevents default browser right-click menu
                            e.stopPropagation();
                            setActiveContextMenu(activeContextMenu === lm.id ? null : lm.id);
                            setActiveTooltip(null);
                          }}
                        ></span>
                        
                        {/* Left Click Tooltip */}
                        {activeTooltip === lm.id && (
                          <div className="landmark-tooltip" onClick={(e) => e.stopPropagation()}>
                            <strong>{lm.name}</strong>
                            {lm.diseases && <div className="tooltip-info"><strong>Diseases:</strong> {lm.diseases}</div>}
                            {lm.specialists && <div className="tooltip-info"><strong>Specialist:</strong> {lm.specialists}</div>}
                            {lm.treatments && <div className="tooltip-info"><strong>Treatments:</strong> {lm.treatments}</div>}
                            <span className="landmark-meta">By: {lm.authorName} ({lm.status})</span>
                          </div>
                        )}

                        {/* Right Click Action Menu */}
                        {activeContextMenu === lm.id && user && (
                          <div className="landmark-actions-menu" onClick={(e) => e.stopPropagation()}>
                            {(user.email === ADMIN_EMAIL || user.email === lm.authorEmail) && (
                              <>
                                <button onClick={() => startEditLandmark(lm)}>Edit</button>
                                <button className="btn-delete" onClick={() => { deleteLandmark(lm.id); setActiveContextMenu(null); }}>Delete</button>
                              </>
                            )}
                            {user.email === ADMIN_EMAIL && lm.status === 'pending' && (
                              <button className="btn-approve" onClick={() => { approveLandmark(lm.id); setActiveContextMenu(null); }}>Approve</button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Render Input Box for New Landmark */}
                    {activeInput && (
                      <div className="landmark-input-box" style={{ left: `${activeInput.x}%`, top: `${activeInput.y}%` }} onClick={(e) => e.stopPropagation()}>
                        <h4>{editingLandmarkId ? 'Edit Details' : 'Add Details'}</h4>
                        <input autoFocus type="text" placeholder="Structure name..." value={newLandmarkData.name} onChange={(e) => setNewLandmarkData({...newLandmarkData, name: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && saveLandmark()} />
                        <input type="text" placeholder="Associated Diseases..." value={newLandmarkData.diseases} onChange={(e) => setNewLandmarkData({...newLandmarkData, diseases: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && saveLandmark()} />
                        <input type="text" placeholder="Right Specialist..." value={newLandmarkData.specialists} onChange={(e) => setNewLandmarkData({...newLandmarkData, specialists: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && saveLandmark()} />
                        <input type="text" placeholder="Treatments (optional)..." value={newLandmarkData.treatments} onChange={(e) => setNewLandmarkData({...newLandmarkData, treatments: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && saveLandmark()} />
                        <div className="input-actions">
                          <button className="btn-save" onClick={saveLandmark}>Save</button>
                          <button className="btn-cancel" onClick={() => {setActiveInput(null); setEditingLandmarkId(null);}}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {currentProc.referenceLink && (
              <a href={currentProc.referenceLink} target="_blank" rel="noopener noreferrer" className="reference-link">
                Read the full detailed article
              </a>
            )}

            <hr style={{margin: '40px 0', borderColor: '#eee'}} />

            {/* --- Discussion & Diagnosis Thread --- */}
            <div className="comments-section">
              <h3>Diagnosis & Discussion</h3>
              
              {comments.map(c => (
                <div key={c.id} className={`comment-card ${c.isFinal ? 'comment-final' : ''}`}>
                  {c.isFinal && <div className="final-badge">⭐ Admin Verified Diagnosis</div>}
                  <div className="comment-header">
                    <div className="post-avatar" style={{width: '24px', height: '24px', fontSize: '12px', marginRight: '8px'}}>
                      {(() => {
                        const commentAuthor = allUsers.find(u => u.id === c.authorId);
                        return commentAuthor?.profilePic ? <img src={commentAuthor.profilePic} className="avatar-img" alt="" /> : (c.authorName || '?')[0].toUpperCase();
                      })()}
                    </div>
                    <strong>{c.authorName}</strong>
                    {c.authorRole === 'admin' && <span className="badge badge-admin">Admin</span>}
                    {c.authorRole === 'dentist' && <span className="badge badge-dentist">Specialist</span>}
                    <span className="comment-date">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {editingCommentId === c.id ? (
                    <div className="add-comment-box" style={{marginTop: '10px', marginBottom: '10px'}}>
                      <textarea value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} rows="3" />
                      <div style={{display: 'flex', gap: '10px'}}>
                        <button className="btn-save" onClick={() => handleUpdateComment(c.id)}>Save Changes</button>
                        <button className="btn-cancel" onClick={() => { setEditingCommentId(null); setEditCommentText(''); }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-text">{c.text} {c.updatedAt && <em style={{fontSize:'12px', color:'#999'}}>(Edited)</em>}</p>
                  )}
                  
                  <div className="comment-actions">
                    <button className="btn-upvote" onClick={() => handleUpvote(c.id, c.upvotes)}>
                      👍 Upvote ({c.upvotes || 0})
                    </button>
                    <button className="btn-upvote" onClick={() => handleReport('comment', currentPage, c.id)}>
                      🚩 Report
                    </button>
                    {userProfile?.role === 'admin' && !c.isFinal && (
                      <button className="btn-final" onClick={() => handleMarkFinal(c.id)}>✓ Mark as Final Diagnosis</button>
                    )}
                    {(userProfile?.role === 'admin' || user?.uid === c.authorId) && !editingCommentId && (
                      <>
                        {user?.uid === c.authorId && (
                          <button className="btn-edit-proc" style={{margin: 0, padding: '5px 10px'}} onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.text); }}>Edit</button>
                        )}
                        <button className="btn-delete-proc" style={{margin: 0, padding: '5px 10px'}} onClick={() => handleDeleteComment(c.id)}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {user ? (
                <div className="add-comment-box">
                  <textarea placeholder="Provide your diagnosis, advice, or feedback..." value={newComment} onChange={e => setNewComment(e.target.value)} rows="3" />
                  <button className="btn-save" onClick={handleAddComment}>Post Response</button>
                </div>
              ) : (
                <div className="add-comment-box" style={{alignItems: 'flex-start'}}>
                  <p><em>Please log in to participate in the discussion.</em></p>
                  <button className="btn-save" onClick={() => setShowLoginModal(true)}>Log in with Google</button>
                </div>
              )}
            </div>

            {/* Edit / Admin Controls inside Article */}
            <div style={{marginTop: '30px', textAlign: 'center'}}>
              {user && (userProfile?.role === 'admin' || user.uid === currentProc.authorId) && (
                <button className="btn-edit-proc" onClick={(e) => { startEditProcedure(currentProc, e); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit Content</button>
              )}
              {user && userProfile?.role === 'admin' && (
                <button className="btn-delete-proc" onClick={(e) => { e.stopPropagation(); handleDeleteProcedure(currentProc.id); }}>Permanently Delete</button>
              )}
              {user && user.uid === currentProc.authorId && (
                <button className="btn-dashboard" style={{background: currentProc.isResolved ? '#6c757d' : '#28a745', marginLeft: '10px'}} onClick={() => handleToggleResolved(currentProc.id, currentProc.isResolved)}>
                  {currentProc.isResolved ? 'Reopen Case' : '✅ Mark as Resolved'}
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Fallback if procedure is deleted while viewing
    return <div><button onClick={() => setCurrentPage('home')}>Return to Home</button></div>;
  };

  return (
    <div className="app-container">
      
      {/* Instagram-style Top Bar */}
      <header className="top-bar">
        <h1 className="logo" onClick={() => setCurrentPage('home')}>DentalGuide</h1>
        <div className="top-actions">
          {installPrompt && (
            <button onClick={() => {
              installPrompt.prompt();
              installPrompt.userChoice.then(choice => {
                if (choice.outcome === 'accepted') setInstallPrompt(null);
              });
            }} className="btn-top-action" style={{background: '#007bff', color: 'white', padding: '4px 10px', borderRadius: '4px'}}>
              📲 Install
            </button>
          )}
          <button onClick={() => setDarkMode(!darkMode)} className="btn-top-action" title="Toggle Dark Mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
          {userProfile?.role === 'admin' && (
            <button onClick={() => setCurrentPage('admin-dashboard')} className="btn-top-action admin">Admin</button>
          )}
          {user ? (
            <>
              <button onClick={() => setCurrentPage('inbox')} className="btn-top-action" style={{fontSize: '18px', marginRight: '10px'}}>📩</button>
              <button onClick={handleLogout} className="btn-top-action">Logout</button>
            </>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="btn-top-action login">Login</button>
          )}
        </div>
      </header>

      {userProfile?.role === 'user' && isApplyingDentist && (
        <div className="dentist-apply-banner">
          <input type="text" placeholder="Registration No." value={dentistRegNo} onChange={e => setDentistRegNo(e.target.value)} />
          <input type="text" placeholder="Specialty (e.g. Orthodontics)" value={dentistSpecialty} onChange={e => setDentistSpecialty(e.target.value)} />
          <button onClick={applyForDentist} className="btn-submit">Submit</button>
          <button onClick={() => setIsApplyingDentist(false)} className="btn-cancel">Cancel</button>
          </div>
      )}

      <main className={`main-content ${currentPage === 'admin-dashboard' ? 'admin-mode' : ''}`}>
        {renderPage()}
      </main>

      {/* Instagram-style Bottom Nav */}
      <nav className="bottom-nav">
        <button className={`nav-btn ${currentPage === 'home' ? 'active' : ''}`} onClick={() => setCurrentPage('home')}>🏠</button>
        <button className={`nav-btn ${currentPage === 'search' ? 'active' : ''}`} onClick={() => setCurrentPage('search')}>🔍</button>
        <button className={`nav-btn ${currentPage === 'upload' ? 'active' : ''}`} onClick={() => user ? setCurrentPage('upload') : setShowLoginModal(true)}>➕</button>
        <button className={`nav-btn ${currentPage === 'profile' ? 'active' : ''}`} onClick={() => user ? setCurrentPage('profile') : setShowLoginModal(true)}>👤</button>
      </nav>
      
      {/* Login / Registration Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={e => e.stopPropagation()}>
            <h2>Join the Community</h2>
            <p>Please log in or register using your Google account to submit cases, ask questions, and interact with specialists.</p>
            <div className="login-options">
              <button className="btn-login-patient" onClick={() => handleLogin('upload')}>
                👤 Login as Patient / User
              </button>
              <button className="btn-login-dentist" onClick={() => handleLogin('dentist')}>
                🦷 Login as Dentist / Specialist
              </button>
            </div>
            <button className="btn-close-modal" onClick={() => setShowLoginModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Share to DM Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(null)}>
          <div className="login-modal" onClick={e => e.stopPropagation()}>
            <h2>Share Case</h2>
            <p style={{fontSize: '14px', color: '#666'}}>Select a user to forward <strong>{showShareModal.title}</strong> to:</p>
            <div className="share-list">
              {(() => {
                const chatUserIds = chats.map(c => c.participants.find(id => id !== user.uid));
                const followingIds = userProfile?.following || [];
                const combinedIds = [...new Set([...chatUserIds, ...followingIds])];
                const shareContacts = combinedIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean);
                
                if (shareContacts.length === 0) return <p style={{color: '#8e8e8e', marginTop: '20px'}}>You don't follow anyone or have any active chats yet.</p>;

                return shareContacts.map(contact => (
                  <div key={contact.id} className="share-list-item">
                    <div className="post-avatar" style={{width: '32px', height: '32px', marginRight: '10px', flexShrink: 0}}>
                      {(() => {
                        const contactAvatar = contact.profilePic ? <img src={contact.profilePic} className="avatar-img" alt="" /> : contact.name[0].toUpperCase();
                        return contactAvatar;
                      })()}
                    </div>
                    <div style={{flex: 1, textAlign: 'left', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{contact.name}</div>
                    <button className="btn-save" style={{padding: '6px 12px', marginLeft: '10px'}} onClick={() => handleShareToUser(contact)}>Send</button>
                  </div>
                ));
              })()}
            </div>
            <button className="btn-close-modal" style={{marginTop: '15px'}} onClick={() => setShowShareModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Image Editor Modal */}
      {editorConfig && (
        <div className="editor-modal-overlay">
          <div className="editor-modal-content">
            <button className="btn-close-editor" onClick={() => setEditorConfig(null)}>✖ Cancel</button>
            <FilerobotImageEditor
              source={editorConfig.src}
              onSave={(editedImageObject) => handleSaveEditedImage(editedImageObject)}
              annotationsCommon={{ fill: '#ff0000' }}
              Text={{ text: 'Redacted' }}
              tabsIds={[TABS.ADJUST, TABS.ANNOTATE, TABS.FILTERS]}
              defaultTabId={TABS.ANNOTATE}
              defaultToolId={TOOLS.PEN}
              savingPixelRatio={4}
              previewPixelRatio={window.devicePixelRatio}
            />
          </div>
        </div>
      )}

      {/* Global Site Footer */}
      <footer className="site-footer">
        <div className="footer-links">
          <button onClick={() => setCurrentPage('support')}>Support & Features</button>
          <button onClick={() => setCurrentPage('privacy-policy')}>Privacy Policy</button>
          <button onClick={() => setCurrentPage('terms-conditions')}>Terms & Conditions</button>
        </div>
        
        <div className="footer-sponsor">
          <a href="https://dentalpark.in" target="_blank" rel="noopener noreferrer">
            {sponsorText}
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;

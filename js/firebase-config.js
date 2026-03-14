
const firebaseConfig = {

  authDomain:        "memorias-de-uma-familia.firebaseapp.com",
  projectId:         "memorias-de-uma-familia",
  storageBucket:     "memorias-de-uma-familia.firebasestorage.app",
 
};

// Inicializa o app Firebase
firebase.initializeApp(firebaseConfig);

// Expõe instâncias globais para os outros scripts
window.fbAuth    = firebase.auth();
window.fbDb      = firebase.firestore();
window.fbStorage = firebase.storage();

// Mantém a sessão de autenticação apenas enquanto o browser está aberto
// (troque para LOCAL se quiser persistir entre sessões)
window.fbAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
  .catch(() => { /* ignore se não suportado */ });

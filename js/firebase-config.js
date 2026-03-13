// ================================================================
//  firebase-config.js — Memórias de uma Família
//  Inicializa o Firebase com as credenciais do seu projeto.
//
//  COMO CONFIGURAR:
//  1. Acesse https://console.firebase.google.com
//  2. Crie ou selecione seu projeto
//  3. Vá em "Configurações do projeto" → "Geral" → role até "Seus apps"
//  4. Clique em "</>" (Web) para registrar um app
//  5. Copie o objeto firebaseConfig e cole abaixo
// ================================================================

const firebaseConfig = {
  apiKey:            "AIzaSyCulIBXrUD_HXj0zyFeCMkXk_FaN9SAXzo",
  authDomain:        "memorias-de-uma-familia.firebaseapp.com",
  projectId:         "memorias-de-uma-familia",
  storageBucket:     "memorias-de-uma-familia.firebasestorage.app",
  messagingSenderId: "362470609688",
  appId:             "1:362470609688:web:0503570718b4f88ee1846d"
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

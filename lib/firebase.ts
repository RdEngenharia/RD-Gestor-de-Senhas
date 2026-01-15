import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração com as chaves inseridas DIRETAMENTE para eliminar erros de conexão
const firebaseConfig = {
  apiKey: "AIzaSyB5R9PQTRTxZWE8-_nRskmREJfrED3Ye1A",
  authDomain: "rd-vault-18160.firebaseapp.com",
  projectId: "rd-vault-18160",
  storageBucket: "rd-vault-18160.firebasestorage.app",
  messagingSenderId: "199145904028",
  appId: "1:199145904028:web:458c9ffdf03151b96a5a59"
};

// Log de controle para o desenvolvedor
if (typeof window !== "undefined") {
    console.log("Conectando ao Firebase: rd-vault-18160");
}

// Inicialização segura do Firebase
let app;
try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (error) {
    console.error("Erro crítico na inicialização do Firebase:", error);
}

// Exportação dos serviços para uso no restante do app
export const auth = getAuth(app);
export const db_cloud = getFirestore(app);
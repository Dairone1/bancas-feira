import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updatePassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

const firebaseConfig = {
  apiKey: "AIzaSyAFowVRdlWTYrugkSk7RBXFby2yOTgAbew",
  authDomain: "gremio-bancas.firebaseapp.com",
  projectId: "gremio-bancas",
  storageBucket: "gremio-bancas.firebasestorage.app",
  messagingSenderId: "727835700442",
  appId: "1:727835700442:web:90bb4e5a9e9b490a7a09e3",
  measurementId: "G-XCY47NZGF9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// import qz from "qz-tray";  // Removido importação do qz-tray

import fundoImg from "../components/ui/fundo.png";

export default function FeiraApp() {
  const [user, setUser] = useState(null);
  const [bancas, setBancas] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedBanca, setSelectedBanca] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNumero, setEditNumero] = useState("");
  const [editProprietario, setEditProprietario] = useState("");
  const [editAluguel, setEditAluguel] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [newNumero, setNewNumero] = useState("");
  const [numeroValido, setNumeroValido] = useState(true);

  // Novo estado para controle do método de pagamento
  const [paymentMethod, setPaymentMethod] = useState(null);

  // Função para cadastrar nova banca
  const handleCadastrarBanca = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const numero = formData.get("numero");
    const proprietario = formData.get("proprietario");

    // Verificar se o número da banca já existe
    const bancaExistente = bancas.find(b => b.numero.toString() === numero.toString());
    if (bancaExistente) {
      alert("Número da banca já cadastrado.");
      return;
    }

    try {
      await addDoc(collection(db, "bancas"), {
        numero,
        proprietario,
        aluguel: "25.00",
        status: "Pendente",
        lastPayment: null,
      });
      fetchBancas();
      setShowForm(false);
      setNewNumero("");
    } catch (err) {
      alert("Erro ao cadastrar banca: " + err.message);
    }
  };

  // Novo estado para controle do formulário de cadastro de usuários
  const [showUserRegisterForm, setShowUserRegisterForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");

  // Novo estado para controle da página de usuários cadastrados
  const [showUsersPage, setShowUsersPage] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRecebimentos, setUserRecebimentos] = useState([]);

  // Estados para edição de usuário
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserFullName, setEditUserFullName] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");

  useEffect(() => {
    async function createDefaultUser() {
      try {
        await createUserWithEmailAndPassword(auth, "felipe@ipu.com", "123456");
        console.log("Usuário padrão criado");
      } catch (error) {
        if (error.code === "auth/email-already-in-use") {
          console.log("Usuário padrão já existe");
        } else {
          console.error("Erro ao criar usuário padrão:", error);
        }
      }
    }
    createDefaultUser();

    onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        fetchBancas();
        setShowUsersPage(false); // Garantir que vá para gerenciamento de bancas
        if (user.email === "felipe@ipu.com") {
          fetchUsuarios();
        }
      }
    });
  }, []);

  const fetchUsuarios = async () => {
    setLoadingUsuarios(true);
    try {
      const snapshot = await getDocs(collection(db, "usuarios"));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsuarios(list);
    } catch (err) {
      alert("Erro ao buscar usuários: " + err.message);
    }
    setLoadingUsuarios(false);
  };

  const fetchUserRecebimentos = async (userId) => {
    try {
      console.log("Buscando histórico de recebimentos para usuárioId:", userId);
      const recebimentosRef = collection(db, "usuarios", userId, "recebimentos");
      const snapshot = await getDocs(recebimentosRef);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Recebimentos encontrados:", list.length);
      setUserRecebimentos(list);
    } catch (err) {
      alert("Erro ao buscar histórico de recebimentos: " + err.message);
    }
  };

  const saveRecebimento = async (userId, banca, paymentMethod, comprovanteHtml) => {
    try {
      console.log("Salvando recebimento para usuário:", userId);
      const recebimentosRef = collection(db, "usuarios", userId, "recebimentos");
      const now = new Date();
      await addDoc(recebimentosRef, {
        bancaNumero: banca.numero,
        valorPago: "25.00",
        data: now.toISOString(),
        paymentMethod: paymentMethod || null,
        comprovanteHtml: comprovanteHtml || null,
      });
      console.log("Recebimento salvo com sucesso");
    } catch (err) {
      console.error("Erro ao salvar recebimento:", err);
      alert("Erro ao salvar recebimento: " + err.message);
    }
  };

  const generatePrintContent = (banca, user, paymentMethod) => {
    const now = new Date();
    return `
      <html>
        <head>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 2mm;
              }
              body {
                font-family: Arial, sans-serif;
                font-size: 11px;
                width: 80mm;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                text-align: center;
              }
              .numero-banca {
                font-size: 22px;
                font-weight: bold;
                margin-bottom: 6px;
              }
              .comprovante {
                margin-top: 6px;
              }
              .comprovante p:first-child {
                font-size: 16px;
                font-weight: bold;
                margin: 0;
              }
              .comprovante p:nth-child(2) {
                font-size: 22px;
                font-weight: bold;
                margin: 0;
              }
              .recebido-por {
                margin-top: 10px;
                font-size: 18px;
                font-style: italic;
                font-weight: bold;
              }
              .payment-method {
                margin-top: 8px;
                font-size: 16px;
                font-weight: bold;
              }
            }
          </style>
        </head>
        <body>
          <div class="numero-banca">Banca</div>
          <div class="numero-banca">Nº ${banca.numero}</div>
          <div class="comprovante">
            <p>Data: ${now.toLocaleDateString()}</p>
            <p>Valor Pago: R$ ${parseFloat(banca.aluguel).toFixed(2)}</p>
            <p class="payment-method">Método de Pagamento: ${paymentMethod ? paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1) : "Não informado"}</p>
            <p class="recebido-por">Recebido por: ${user ? user.email : "Usuário desconhecido"}</p>
          </div>
        </body>
      </html>
    `;
  };

const printComprovante = async (banca, paymentMethod) => {
  const printContent = generatePrintContent(banca, user, paymentMethod);

  // Removido uso do QZ Tray para impressão silenciosa

  // Impressão tradicional via iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  let iframeDoc = iframe.contentWindow || iframe.contentDocument;
  if (iframeDoc.document) iframeDoc = iframeDoc.document;

  iframeDoc.open();
  iframeDoc.write(printContent);
  iframeDoc.close();

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
      } catch (fallbackErr) {
        alert("Erro ao tentar imprimir. Por favor, tente imprimir manualmente.");
      }
    }, 500);
  };

  // Salvar no histórico de recebimentos
  await saveRecebimento(user.uid, banca, paymentMethod);
};

  async function fetchBancas() {
    const snapshot = await getDocs(collection(db, "bancas"));
    const now = new Date();
    const dayOfWeek = now.getDay();

    const list = snapshot.docs.map(doc => {
      const data = doc.data();
      let status = data.status || "";
      let color = "";
      const aluguel = parseFloat(data.aluguel) || 0;
      const lastPaymentDate = data.lastPayment ? new Date(data.lastPayment) : null;
      const now = new Date();

      let weeksLate = 0;
      if (status !== "Pago" && lastPaymentDate) {
        const diffTime = now.getTime() - lastPaymentDate.getTime();
        weeksLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
        if (weeksLate < 0) weeksLate = 0;
      }

      if (dayOfWeek === 3) {
        if (status !== "Pago") {
          status = "Pendente";
          color = "bg-yellow-400";
        } else {
          color = "bg-green-600";
        }
      } else if (dayOfWeek === 4) {
        if (status !== "Pago") {
          status = "Atrasado";
          color = "bg-red-600";
        } else {
          color = "bg-green-600";
        }
      } else if (dayOfWeek === 5) {
        if (status !== "Pago") {
          status = "Atrasado";
          color = "bg-red-600";
        } else {
          color = "bg-green-600";
        }
      } else {
        if (status === "Pago") {
          color = "bg-green-600";
        } else if (status === "Pendente") {
          color = "bg-yellow-400";
        } else if (status === "Atrasado") {
          color = "bg-red-600";
        }
      }

      const totalDue = weeksLate * aluguel;

      return { id: doc.id, ...data, status, color, weeksLate, totalDue };
    });
    setBancas(list);
    setLoading(false);
  }

  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [bancaParaPagamento, setBancaParaPagamento] = useState(null);
  const [usuarioParaPagamento, setUsuarioParaPagamento] = useState(null);

  const handleChangeStatus = async (banca, newStatus, usuario = null) => {
    console.log("handleChangeStatus chamado com status:", newStatus, "para banca:", banca, "usuario:", usuario);
    if (newStatus === "Pago") {
      setBancaParaPagamento(banca);
      setUsuarioParaPagamento(usuario);
      setShowPaymentMethodModal(true);
      console.log("Modal de método de pagamento exibido");
    } else {
      try {
        const bancaRef = doc(db, "bancas", banca.id);
        await updateDoc(bancaRef, { status: newStatus });
        fetchBancas();
      } catch (err) {
        if (err.code === "permission-denied") {
          alert("Permissão negada: você não tem autorização para alterar o status.");
        } else {
          alert("Erro ao alterar status: " + err.message);
        }
      }
    }
  };

  const handleSelectPaymentMethod = async (method) => {
    console.log("handleSelectPaymentMethod chamado com método:", method);
    if (!bancaParaPagamento) {
      console.log("Nenhuma banca selecionada para pagamento");
      return;
    }
    if (!usuarioParaPagamento) {
      console.log("Nenhum usuário selecionado para pagamento");
      alert("Selecione um usuário para pagamento antes de continuar.");
      return;
    }
    setPaymentMethod(method);
    setShowPaymentMethodModal(false);
    // Imprimir comprovante imediatamente após selecionar o método de pagamento
    try {
      const bancaRef = doc(db, "bancas", bancaParaPagamento.id);
      await updateDoc(bancaRef, { status: "Pago", paymentMethod: method });
      console.log("Status da banca atualizado para Pago");
      fetchBancas();
      const comprovanteHtml = generatePrintContent(bancaParaPagamento, usuarioParaPagamento, method);
      // Salvar recebimento apenas uma vez
      if (!usuarioParaPagamento.recebimentoSalvo) {
        await saveRecebimento(usuarioParaPagamento.id || usuarioParaPagamento.uid, bancaParaPagamento, method, comprovanteHtml);
        usuarioParaPagamento.recebimentoSalvo = true;
      }
      // Chamar printComprovante para imprimir diretamente sem abrir outra página
      printComprovante(bancaParaPagamento, method);
    } catch (err) {
      if (err.code === "permission-denied") {
        alert("Permissão negada: você não tem autorização para alterar o status.");
      } else {
        alert("Erro ao alterar status: " + err.message);
      }
    }
  };

  // Modal para seleção do método de pagamento
  const PaymentMethodModal = () => {
    if (!showPaymentMethodModal) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-center">Selecione o Método de Pagamento</h2>
          <div className="flex justify-around">
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={() => handleSelectPaymentMethod("pix")}
            >
              Pix
            </button>
            <button
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
              onClick={() => handleSelectPaymentMethod("dinheiro")}
            >
              Dinheiro
            </button>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => handleSelectPaymentMethod("cartão")}
            >
              Cartão
            </button>
          </div>
          <div className="mt-4 text-center">
            <button
              className="text-gray-700 underline"
              onClick={() => setShowPaymentMethodModal(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Componente para exibir usuários cadastrados e seus recebimentos
  const UsersPage = () => {
    const [searchRecebimentos, setSearchRecebimentos] = useState("");

    const filteredRecebimentos = userRecebimentos.filter((rec) => {
      const bancaStr = rec.bancaNumero ? rec.bancaNumero.toString() : "";
      const dataStr = rec.data ? new Date(rec.data).toLocaleDateString() : "";
      const searchLower = searchRecebimentos.toLowerCase();
      return bancaStr.toLowerCase().includes(searchLower) || dataStr.toLowerCase().includes(searchLower);
    });

    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Usuários Cadastrados</h2>
        {loadingUsuarios ? (
          <p>Carregando usuários...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {usuarios.map((usuario) => (
                <Card key={usuario.id} className="p-4">
                  <h3 className="font-semibold mb-2">{usuario.fullName || usuario.email}</h3>
                  <p>Email: {usuario.email}</p>
                  <div className="mt-4 space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(usuario);
                        setEditUserEmail(usuario.email || "");
                        setEditUserFullName(usuario.fullName || "");
                        setEditUserPassword("");
                        setIsEditingUser(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setSelectedUser(usuario);
                        console.log("Usuário selecionado para histórico:", usuario);
                        await fetchUserRecebimentos(usuario.uid || usuario.id);
                      }}
                    >
                      Ver Histórico de Recebimentos
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        if (window.confirm("Tem certeza que deseja excluir este usuário?")) {
                          try {
                            await deleteDoc(doc(db, "usuarios", usuario.id));
                            fetchUsuarios();
                          } catch (err) {
                            alert("Erro ao excluir usuário: " + err.message);
                          }
                        }
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            {selectedUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
                <div className="bg-white p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-lg relative">
                  <button
                    className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserRecebimentos([]);
                    }}
                  >
                    &times;
                  </button>
                  <h3 className="text-xl font-bold mb-4">Histórico de Recebimentos de {selectedUser.fullName || selectedUser.email}</h3>
                  <input
                    type="text"
                    placeholder="Buscar por banca ou data"
                    value={searchRecebimentos}
                    onChange={(e) => setSearchRecebimentos(e.target.value)}
                    className="mb-4 w-full p-2 border border-gray-300 rounded"
                  />
                  {filteredRecebimentos.length === 0 ? (
                    <p>Nenhum recebimento encontrado para este usuário.</p>
                  ) : (
                    <ul className="max-h-96 overflow-auto space-y-2">
                      {filteredRecebimentos.map((rec) => (
                        <li key={rec.id} className="border-b border-gray-300 py-2">
                          <div className="p-2 bg-gray-50">
                            <p><strong>Banca</strong></p>
                            <p><strong>Nº:</strong> {rec.bancaNumero || "N/A"}</p>
                            <p><strong>Data:</strong> {rec.data ? new Date(rec.data).toLocaleDateString() : "N/A"}</p>
                            <p><strong>Valor Pago:</strong> R$ {rec.valorPago || "N/A"}</p>
                            <p><strong>Método de Pagamento:</strong> {rec.paymentMethod ? rec.paymentMethod.charAt(0).toUpperCase() + rec.paymentMethod.slice(1) : "N/A"}</p>
                            <p><strong>Recebido por:</strong> {selectedUser ? (selectedUser.fullName || selectedUser.email) : "N/A"}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => {
                                // Função para imprimir o comprovante
                                const printWindow = window.open("", "_blank");
                                if (printWindow) {
                                  const content = rec.comprovanteHtml || `
                                    <html>
                                      <head>
                                        <title>Comprovante de Pagamento</title>
                                      </head>
                                      <body>
                                        <h2>Comprovante de Pagamento</h2>
                                        <p><strong>Banca Nº:</strong> ${rec.bancaNumero || "N/A"}</p>
                                        <p><strong>Data:</strong> ${rec.data ? new Date(rec.data).toLocaleDateString() : "N/A"}</p>
                                        <p><strong>Valor Pago:</strong> R$ ${rec.valorPago || "N/A"}</p>
                                        <p><strong>Método de Pagamento:</strong> ${rec.paymentMethod ? rec.paymentMethod.charAt(0).toUpperCase() + rec.paymentMethod.slice(1) : "N/A"}</p>
                                        <p><strong>Recebido por:</strong> ${selectedUser ? (selectedUser.fullName || selectedUser.email) : "N/A"}</p>
                                      </body>
                                    </html>
                                  `;
                                  printWindow.document.write(content);
                                  printWindow.document.close();
                                  printWindow.focus();
                                  printWindow.print();
                                  printWindow.close();
                                } else {
                                  alert("Não foi possível abrir a janela de impressão.");
                                }
                              }}
                            >
                              Imprimir Comprovante
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        <div className="mt-4">
          <Button onClick={() => setShowUsersPage(false)}>Voltar</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container p-6 bg-gray-50 min-h-screen font-sans text-gray-800">

      {!user && (
        <div className="relative flex items-center justify-center min-h-screen p-4">
          <img
            src={fundoImg}
            alt="Fundo"
            className="absolute inset-0 w-full h-full object-cover filter blur-sm brightness-75"
          />
          <div className="relative max-w-md w-full p-8 bg-white bg-opacity-90 rounded-3xl shadow-2xl border border-gray-300">
            <h2 className="text-4xl font-extrabold mb-8 text-center text-blue-700 tracking-wide drop-shadow-md">Login</h2>
            {/* Formulário de login */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const email = formData.get("email");
                const password = formData.get("password");
                try {
                  await signInWithEmailAndPassword(auth, email, password);
                } catch (err) {
                  alert("Erro ao fazer login: " + err.message);
                }
              }}
              className="space-y-6"
            >
              <Input
                name="email"
                type="email"
                placeholder="Email"
                required
                className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-400 transition"
              />
              <Input
                name="password"
                type="password"
                placeholder="Senha"
                required
                className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-400 transition"
              />
              <Button type="submit" className="w-full py-4 text-xl font-semibold rounded-xl shadow-lg hover:shadow-xl transition duration-300 bg-blue-600 hover:bg-blue-700 text-white">
                Entrar
              </Button>
            </form>
          </div>
        </div>
      )}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md space-y-4 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-center">Editar Banca</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const bancaRef = doc(db, "bancas", selectedBanca.id);
                  await updateDoc(bancaRef, {
                    numero: editNumero,
                    proprietario: editProprietario,
                    aluguel: editAluguel,
                  });
                  setIsEditing(false);
                  setSelectedBanca(null);
                  fetchBancas();
                } catch (err) {
                  alert("Erro ao atualizar banca: " + err.message);
                }
              }}
              className="space-y-4"
            >
              <Input
                name="numero"
                type="text"
                placeholder="Número da Banca"
                value={editNumero}
                onChange={(e) => setEditNumero(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-400 transition"
              />
              <Input
                name="proprietario"
                type="text"
                placeholder="Nome do Proprietário (opcional)"
                value={editProprietario}
                onChange={(e) => setEditProprietario(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-400 transition"
              />
              <Input
                name="aluguel"
                type="text"
                placeholder="Aluguel"
                value={editAluguel}
                onChange={(e) => setEditAluguel(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-400 transition"
              />
              <div className="flex justify-between">
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition">
                  Salvar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedBanca(null);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-md transition"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {user && !showUsersPage && (
        <div>
          <h2 className="text-4xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 drop-shadow-lg flex justify-between items-center">
            Gerenciamento de Bancas
            <Button
              onClick={async () => {
                try {
                  await signOut(auth);
                } catch (err) {
                  alert("Erro ao sair: " + err.message);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition"
            >
              Sair
            </Button>
          </h2>
          <div className="flex flex-col md:flex-row md:space-x-8 space-y-6 md:space-y-0 mb-8">
            <div className="md:w-1/4 bg-white p-6 rounded-lg shadow-lg border border-gray-200 h-screen">
              <Input
                type="text"
                placeholder="Buscar bancas pelo número"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full mb-6 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-400 transition"
              />
              <Button
                onClick={() => setShowUsersPage(true)}
                className="mb-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg shadow-md transition"
              >
                Gerenciar Usuários
              </Button>
              {showForm ? (
                <form onSubmit={handleCadastrarBanca} className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">Cadastrar Nova Banca</h3>
                  <Input
                    name="numero"
                    type="text"
                    placeholder="Número da Banca"
                    value={newNumero}
                    onChange={(e) => setNewNumero(e.target.value)}
                    required
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-400 transition"
                  />
                  <Input
                    name="proprietario"
                    type="text"
                    placeholder="Nome do Proprietário (opcional)"
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-400 transition"
                  />
                  <div className="flex space-x-4">
                    <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg shadow-md transition">
                      Cadastrar
                    </Button>
                    <Button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg shadow-md transition">
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  onClick={() => setShowForm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition"
                >
                  Cadastrar Nova Banca
                </Button>
              )}
            </div>
            <div className="md:w-2/3">
              {/* Renderizar lista de bancas */}
              {loading ? (
                <p className="text-gray-600">Carregando bancas...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {bancas
                    .filter((banca) =>
                      banca.numero.toString().includes(search)
                    )
                    .map((banca) => (
                      <Card
                        key={banca.id}
                        className={`p-4 rounded-lg shadow-md transition-shadow duration-300 ${
                          banca.status === "Pago" ? "bg-green-50 border border-green-300" : "bg-white border border-gray-200"
                        }`}
                      >
                        <h3 className="font-semibold mb-1 text-lg text-gray-900">Banca Nº {banca.numero}</h3>
                        {banca.proprietario && (
                          <p className="text-gray-700 mb-1 text-sm">Proprietário: {banca.proprietario}</p>
                        )}
                        <p className={`font-semibold text-sm px-2 py-1 rounded inline-block ${
                          banca.status === "Pago" ? "bg-green-200 text-green-800" :
                          banca.status === "Pendente" ? "bg-yellow-300 text-yellow-900" :
                          banca.status === "Atrasado" ? "bg-red-300 text-red-900" :
                          "bg-gray-200 text-gray-800"
                        }`}>
                          {banca.status || "Pendente"}
                        </p>
                        <p className="text-gray-700 mt-2 mb-3 text-sm">Aluguel: R$ {parseFloat(banca.aluguel).toFixed(2)}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setSelectedBanca(banca);
                              setEditNumero(banca.numero);
                              setEditProprietario(banca.proprietario);
                              setEditAluguel(banca.aluguel);
                              setIsEditing(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={async () => {
                              if (window.confirm("Tem certeza que deseja excluir esta banca?")) {
                                try {
                                  await deleteDoc(doc(db, "bancas", banca.id));
                                  fetchBancas();
                                } catch (err) {
                                  alert("Erro ao excluir banca: " + err.message);
                                }
                              }
                            }}
                          >
                            Excluir
                          </Button>
                          {banca.status !== "Pago" && (
                            <Button
                              size="sm"
                              variant="primary"
                              className="flex-1"
                              onClick={() => handleChangeStatus(banca, "Pago", user)}
                            >
                              Marcar como Pago
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="text-center text-gray-500 text-sm select-none mt-6 mb-4">
        © Copyright 2020-2025 Jerson Barros S.A
      </div>

      {user && showUsersPage && <UsersPage />}

      <PaymentMethodModal />
    </div>
  );
}

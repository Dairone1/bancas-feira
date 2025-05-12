import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
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
} from "firebase/auth";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

const firebaseConfig = {
  apiKey: "AIzaSyB1Ks1ejpmrbDjihzx9OmnWsO7_oTMu_SA",
  authDomain: "controle-de-bancas.firebaseapp.com",
  projectId: "controle-de-bancas",
  storageBucket: "controle-de-bancas.firebasestorage.app",
  messagingSenderId: "218421342868",
  appId: "1:218421342868:web:afe611e4adaf2606563a81",
  measurementId: "G-37T1XD08B0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

import fundoImg from "../components/ui/fundo.png";

export default function FeiraApp() {
  // Estado para controle da seção ativa no menu lateral
  const [activeSection, setActiveSection] = useState("bancas");

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
  const [newNumero, setNewNumero] = useState("");

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

  // Novo estado para controle da página de usuários cadastrados
  const [showUsersPage, setShowUsersPage] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [userRecebimentos, setUserRecebimentos] = useState([]);
  const [showUserRecebimentos, setShowUserRecebimentos] = useState(false);
  const [userName, setUserName] = useState("");

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
      if (user) {
        setUser(user);
        fetchBancas();
        setShowUsersPage(false); // Garantir que vá para gerenciamento de bancas
        if (user.email && user.email.toLowerCase() === "felipe@ipu.com") {
          fetchUsuarios();
        }
      } else {
        setUser(null);
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
      // Garantir que o valorPago seja sempre 25.00
      const valorPago = 25.00;
      const paymentMethodNormalized = paymentMethod ? paymentMethod.toString().toLowerCase() : null;
      await addDoc(recebimentosRef, {
        bancaNumero: banca.numero,
        valorPago: valorPago,
        data: now.toISOString(),
        paymentMethod: paymentMethodNormalized,
        comprovanteHtml: comprovanteHtml || null,
      });
      console.log("Recebimento salvo com sucesso");
      // Atualizar o estado userRecebimentos após salvar
      if (userId) {
        fetchUserRecebimentos(userId);
      }
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
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 6px;
              }
              .comprovante {
                margin-top: 6px;
              }
              .comprovante p:first-child {
                font-size: 20px;
                font-weight: bold;
                margin: 0;
              }
              .comprovante p:nth-child(2) {
                font-size: 18px;
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

    // Removida a chamada duplicada para saveRecebimento para evitar valor duplicado
    // await saveRecebimento(user.uid, banca, paymentMethod);
  };

  const fetchBancas = async () => {
    try {
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
    } catch (err) {
      alert("Erro ao buscar bancas: " + err.message);
      setLoading(false);
    }
  };

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
  const UsersPage = ({ showUserRecebimentos, setShowUserRecebimentos }) => {
    const [searchRecebimentos, setSearchRecebimentos] = useState("");
    const [showUserRegisterForm, setShowUserRegisterForm] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserFullName, setNewUserFullName] = useState("");
    const [isEditingUser, setIsEditingUser] = useState(false);
    const [editUserEmail, setEditUserEmail] = useState("");
    const [editUserFullName, setEditUserFullName] = useState("");
    const [editUserPassword, setEditUserPassword] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);

    const filteredRecebimentos = userRecebimentos.filter((rec) => {
      const bancaStr = rec.bancaNumero ? rec.bancaNumero.toString() : "";
      const dataStr = rec.data ? new Date(rec.data).toLocaleDateString() : "";
      const searchLower = searchRecebimentos.toLowerCase();
      return bancaStr.toLowerCase().includes(searchLower) || dataStr.toLowerCase().includes(searchLower);
    });

    // Calcular totais por método de pagamento e total geral
    const totalPix = userRecebimentos
      .filter(rec => rec.paymentMethod && rec.paymentMethod.toLowerCase() === "pix")
      .reduce((sum, rec) => sum + parseFloat(rec.valorPago || 0), 0);
    const totalDinheiro = userRecebimentos
      .filter(rec => rec.paymentMethod && rec.paymentMethod.toLowerCase() === "dinheiro")
      .reduce((sum, rec) => sum + parseFloat(rec.valorPago || 0), 0);
    const totalCartao = userRecebimentos
      .filter(rec => rec.paymentMethod && rec.paymentMethod.toLowerCase() === "cartão")
      .reduce((sum, rec) => sum + parseFloat(rec.valorPago || 0), 0);
    const totalGeral = totalPix + totalDinheiro + totalCartao;

    const handleUserUpdate = async (e) => {
      e.preventDefault();
      if (!selectedUser) return;
      try {
        // Update user email and password in Firebase Auth
        if (editUserEmail !== selectedUser.email) {
          // Firebase Auth email update requires re-authentication, skipping for now
          alert("Alteração de email não suportada no momento.");
          return;
        }
        if (editUserPassword) {
          await auth.currentUser.updatePassword(editUserPassword);
        }
        // Update user data in Firestore
        const userRef = doc(db, "usuarios", selectedUser.id);
        await updateDoc(userRef, {
          fullName: editUserFullName,
        });
        setIsEditingUser(false);
        setSelectedUser(null);
        fetchUsuarios();
      } catch (error) {
        alert("Erro ao atualizar usuário: " + error.message);
      }
    };

    return (
      <div>
        <h2 className="text-2xl font-bold mb-4 flex justify-between items-center">
          <span>Usuários Cadastrados</span>
          <div className="space-x-2 flex">
            <Button
              size="xs"
              variant="primary"
              onClick={() => setShowUserRegisterForm(true)}
              className="w-24 text-center"
            >
              Novo Usuário
            </Button>
            <Button
              size="xs"
              variant="secondary"
              onClick={() => setShowUsersPage(false)}
              className="w-24"
            >
              Voltar
            </Button>
          </div>
        </h2>
        {showUserRegisterForm ? (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-50 p-4 z-50">
            <div className="relative max-w-md w-full p-8 bg-white rounded-3xl shadow-2xl border border-gray-300">
              <h3 className="text-2xl font-extrabold mb-6 text-center text-blue-700 tracking-wide drop-shadow-md">Cadastrar Novo Usuário</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      // Salvar usuário atual para restaurar após criação do novo usuário
                      const currentUser = auth.currentUser;

                      const userCredential = await createUserWithEmailAndPassword(
                        auth,
                        newUserEmail,
                        newUserPassword
                      );
                      const newUser = userCredential.user;
                      // Salvar nome completo no Firestore
                      await addDoc(collection(db, "usuarios"), {
                        uid: newUser.uid,
                        email: newUserEmail,
                        fullName: newUserFullName,
                      });

                      // Após criar o usuário, fazer logout do usuário criado e alertar para login manual
                      if (currentUser && currentUser.email !== newUserEmail) {
                        await signOut(auth);
                        alert("Usuário criado com sucesso. Por favor, faça login novamente com seu usuário original.");
                      }

                      setShowUserRegisterForm(false);
                      setNewUserEmail("");
                      setNewUserPassword("");
                      setNewUserFullName("");
                      fetchUsuarios();
                    } catch (error) {
                      alert("Erro ao cadastrar usuário: " + error.message);
                    }
                  }}
                  className="space-y-6"
                >
                  <Input
                    type="email"
                    placeholder="Email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                    className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-400 transition"
                  />
                <Input
                  type="password"
                  placeholder="Senha"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-400 transition"
                />
                <Input
                  type="text"
                  placeholder="Nome Completo"
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-400 transition"
                />
                <div className="flex space-x-4">
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl shadow-lg transition">
                    Cadastrar
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-4 rounded-xl shadow-lg transition"
                    onClick={() => setShowUserRegisterForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : showUserRecebimentos ? (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 overflow-auto max-h-[80vh]">
              <h3 className="text-2xl font-bold mb-6 text-center">
                Histórico de Recebimentos - {userName}
              </h3>
              <Input
                type="text"
                placeholder="Buscar no histórico"
                value={searchRecebimentos}
                onChange={(e) => setSearchRecebimentos(e.target.value)}
                className="mb-6 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-400 transition"
              />
              <div className="mb-6 p-4 border border-gray-300 rounded-lg shadow-sm bg-gray-50">
                <h4 className="text-lg font-semibold mb-2">Totais Recebidos</h4>
                <p className="text-sm italic mb-2">Usuário: {selectedUser ? `${selectedUser.email} (ID: ${selectedUser.uid || selectedUser.id})` : "Nenhum usuário selecionado"}</p>
                <p className="text-xl font-bold text-blue-700">Total Geral: R$ {totalGeral.toFixed(2)}</p>
                <p>Total em Pix: R$ {totalPix.toFixed(2)}</p>
                <p>Total em Dinheiro: R$ {totalDinheiro.toFixed(2)}</p>
                <p>Total em Cartão: R$ {totalCartao.toFixed(2)}</p>
              </div>
              {searchRecebimentos.trim() === "" ? (
                <p className="text-center text-gray-600">Digite uma data ou número da banca para buscar no histórico.</p>
              ) : filteredRecebimentos.length === 0 ? (
                <p className="text-center text-gray-600">Nenhum recebimento encontrado.</p>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {filteredRecebimentos.map((rec) => (
                    <Card key={rec.id} className="p-4">
                      <p>Banca Nº: {rec.bancaNumero}</p>
                      <p>Data: {new Date(rec.data).toLocaleDateString()}</p>
                      <p>Valor Pago: R$ {parseFloat(rec.valorPago).toFixed(2)}</p>
                      <p>Método de Pagamento: {rec.paymentMethod || "Não informado"}</p>
                      <div className="mt-2 flex space-x-2">
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-center">
                <Button onClick={() => setShowUserRecebimentos(false)}>Voltar</Button>
              </div>
            </div>
          </div>
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
                        setShowUserRecebimentos(false);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(usuario);
                        setUserName(usuario.email || "");
                        setShowUserRecebimentos(true);
                        fetchUserRecebimentos(usuario.uid || usuario.id);
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
          </>
        )}
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
          {user && user.email && user.email.toLowerCase() === "felipe@ipu.com" && (
            <Button
              onClick={() => setShowUsersPage(true)}
              className="mb-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg shadow-md transition"
            >
              Gerenciar Usuários
            </Button>
          )}
          {console.log("Usuário atual:", user ? user.email : "Nenhum usuário autenticado")}
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

      {user && showUsersPage && <UsersPage showUserRecebimentos={showUserRecebimentos} setShowUserRecebimentos={setShowUserRecebimentos} />}
      <PaymentMethodModal />
    </div>
  );
}



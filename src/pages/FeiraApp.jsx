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
      const recebimentosRef = collection(db, "usuarios", userId, "recebimentos");
      const snapshot = await getDocs(recebimentosRef);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserRecebimentos(list);
    } catch (err) {
      alert("Erro ao buscar histórico de recebimentos: " + err.message);
    }
  };

  const saveRecebimento = async (userId, banca) => {
    try {
      const recebimentosRef = collection(db, "usuarios", userId, "recebimentos");
      const now = new Date();
      await addDoc(recebimentosRef, {
        bancaNumero: banca.numero,
        valorPago: "25.00",
        data: now.toISOString(),
      });
    } catch (err) {
      alert("Erro ao salvar recebimento: " + err.message);
    }
  };

  const generatePrintContent = (banca, user) => {
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
              .recebido-por {
                margin-top: 10px;
                font-size: 10px;
                font-style: italic;
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
            <p class="recebido-por">Recebido por: ${user ? user.email : "Usuário desconhecido"}</p>
          </div>
        </body>
      </html>
    `;
  };

  const printComprovante = async (banca) => {
    const printContent = generatePrintContent(banca, user);
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(printContent);
      newWindow.document.close();
      newWindow.focus();
      try {
        newWindow.print();
      } catch (error) {
        alert("Erro ao tentar imprimir. Por favor, tente imprimir manualmente.");
      }
      // Não fechar a janela automaticamente para permitir impressão manual em dispositivos móveis
      // newWindow.close();
      // Salvar histórico de recebimentos para o usuário logado
      await saveRecebimento(user.uid, banca);
    } else {
      alert("Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativado.");
    }
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

  const handleChangeStatus = async (banca, newStatus) => {
    if (newStatus === "Pago") {
      const confirm = window.confirm("Deseja realmente marcar como pago?");
      if (!confirm) return;
      try {
        const bancaRef = doc(db, "bancas", banca.id);
        await updateDoc(bancaRef, { status: newStatus });
        fetchBancas();
        if (user) {
          await saveRecebimento(user.uid, banca);
        }
        printComprovante(banca);
      } catch (err) {
        if (err.code === "permission-denied") {
          alert("Permissão negada: você não tem autorização para alterar o status.");
        } else {
          alert("Erro ao alterar status: " + err.message);
        }
      }
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

  // Função para cadastrar nova banca
  const handleCadastrarBanca = async (e) => {
    e.preventDefault();
    if (!numeroValido) {
      alert("Número da banca já existe. Escolha outro número.");
      return;
    }
    const formData = new FormData(e.target);
    const numero = formData.get("numero");
    const proprietario = formData.get("proprietario");
    try {
      await addDoc(collection(db, "bancas"), {
        numero,
        proprietario,
        status: "",
        aluguel: 25.00,
        lastPayment: null,
      });
      setShowForm(false);
      setNewNumero("");
      fetchBancas();
    } catch (err) {
      alert("Erro ao cadastrar banca: " + err.message);
    }
  };

  // Função para salvar edição da banca
  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const numero = formData.get("numero");
    const proprietario = formData.get("proprietario");
    const aluguel = parseFloat(formData.get("aluguel"));
    if (isNaN(aluguel) || aluguel < 0) {
      alert("Valor do aluguel inválido.");
      return;
    }
    try {
      const bancaRef = doc(db, "bancas", selectedBanca.id);
      await updateDoc(bancaRef, {
        numero,
        proprietario,
        aluguel,
      });
      setIsEditing(false);
      fetchBancas();
    } catch (err) {
      alert("Erro ao salvar edição: " + err.message);
    }
  };

  // Função para cadastrar novo usuário
  const handleUserRegister = async (e) => {
    e.preventDefault();
    // Validação para impedir nome de usuário duplicado
    if (usuarios.some(u => u.fullName === newUserFullName)) {
      alert("Nome de usuário já existe. Escolha outro nome.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newUserEmail, newUserPassword);
      const user = userCredential.user;
      await addDoc(collection(db, "usuarios"), {
        uid: user.uid,
        email: newUserEmail,
        fullName: newUserFullName,
      });
      setShowUserRegisterForm(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserFullName("");
      fetchUsuarios();
    } catch (err) {
      alert("Erro ao cadastrar usuário: " + err.message);
    }
  };

  // Componente para exibir usuários cadastrados e seus recebimentos
  const UsersPage = () => {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Usuários Cadastrados</h2>
        {loadingUsuarios ? (
          <p>Carregando usuários...</p>
        ) : (
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
        )}
        <div className="mt-4">
          <Button onClick={() => setShowUsersPage(false)}>Voltar</Button>
        </div>

        {/* Formulário para editar usuário */}
        {isEditingUser && selectedUser && (
          <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  // Atualizar dados no Firestore
                  const userRef = doc(db, "usuarios", selectedUser.id);
                  await updateDoc(userRef, {
                    email: editUserEmail,
                    fullName: editUserFullName,
                  });

                  // Atualizar senha se for o usuário logado e senha foi alterada
                  if (user.uid === selectedUser.uid && editUserPassword.trim() !== "") {
                    await updatePassword(user, editUserPassword);
                  } else if (editUserPassword.trim() !== "") {
                    alert("Não é possível alterar a senha de outro usuário.");
                  }

                  setIsEditingUser(false);
                  setSelectedUser(null);
                  fetchUsuarios();
                } catch (err) {
                  alert("Erro ao salvar usuário: " + err.message);
                }
              }}
              className="bg-white p-6 rounded-2xl w-full max-w-md space-y-4 shadow-lg overflow-auto max-h-full"
            >
              <h2 className="text-xl font-bold mb-4">Editar Usuário</h2>
              <Input
                type="email"
                name="email"
                placeholder="Email"
                required
                value={editUserEmail}
                onChange={(e) => setEditUserEmail(e.target.value)}
              />
              <Input
                type="text"
                name="fullName"
                placeholder="Nome Completo"
                required
                value={editUserFullName}
                onChange={(e) => setEditUserFullName(e.target.value)}
              />
              <Input
                type="text"
                name="password"
                placeholder="Senha (deixe em branco para não alterar)"
                value={editUserPassword}
                onChange={(e) => setEditUserPassword(e.target.value)}
              />
              {user.email === "felipe@ipu.com" && (
                <div className="mb-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await sendPasswordResetEmail(auth, editUserEmail);
                        alert("Link de redefinição de senha enviado para " + editUserEmail);
                      } catch (error) {
                        alert("Erro ao enviar link de redefinição de senha: " + error.message);
                      }
                    }}
                  >
                    Enviar link de redefinição de senha
                  </Button>
                </div>
              )}
              <div className="flex flex-col sm:flex-row justify-end gap-4">
                <Button type="submit" className="w-full sm:w-auto">Salvar</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditingUser(false);
                    setSelectedUser(null);
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Erro no login:", err);
      alert("Login falhou: " + err.message);
    }
  };

  const filteredBancas = bancas.filter(b => b.numero.includes(search));

  if (!user) {
    return (
      <div className="p-6 max-w-md mx-auto mt-20 bg-white rounded-xl shadow-lg">
        <h1 className="text-3xl font-extrabold mb-6 text-center">Login</h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <Input type="email" name="email" placeholder="Email" required />
          <Input type="password" name="password" placeholder="Senha" required />
          <Button type="submit" className="w-full">Entrar</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-full mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 text-center sm:text-left">Gerenciamento de Bancas</h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <Button className="w-full sm:w-auto" onClick={() => setShowForm(true)}>Cadastrar Nova Banca</Button>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => signOut(auth)}>Sair</Button>
          {/* Botão para cadastrar novo usuário, só para felipe@ipu.com */}
          {user.email === "felipe@ipu.com" && (
            <>
              <Button className="w-full sm:w-auto" onClick={() => setShowUserRegisterForm(true)}>Cadastrar Novo Usuário</Button>
              <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setShowUsersPage(true)}>Página de Usuários</Button>
            </>
          )}
        </div>
      </header>
      <main>
        {showUsersPage ? (
          <UsersPage />
        ) : (
          <>
            <Input
              className="mb-6 w-full max-w-lg mx-auto block"
              placeholder="Buscar banca pelo número"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredBancas.map((banca) => (
                <Card
                  key={banca.id}
                  className="cursor-pointer flex flex-col items-center text-center p-3"
                  onClick={() => {
                    setSelectedBanca(banca);
                    setShowDetails(true);
                  }}
                >
                  <div className="text-xl sm:text-2xl font-semibold mb-2">Nº {banca.numero}</div>
                  <div className={`text-white text-xs sm:text-sm px-3 py-1 rounded inline-block w-max ${banca.color} mb-3`}>
                    {banca.status}
                  </div>
                  <div className="space-x-2">
                    {(banca.status === "Pendente" || banca.status === "Atrasado" || banca.status === "") && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChangeStatus(banca, "Pago");
                        }}
                        disabled={banca.status === "Pago"}
                      >
                        Marcar como Pago
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBanca(banca);
                        setIsEditing(true);
                        setEditNumero(banca.numero);
                        setEditProprietario(banca.proprietario);
                        setEditAluguel(banca.aluguel || "");
                        setShowDetails(false);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async (e) => {
                        e.stopPropagation();
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
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Formulário para cadastrar nova banca */}
      {showForm && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCadastrarBanca}
            className="bg-white p-6 rounded-2xl w-full max-w-md space-y-4 shadow-lg overflow-auto max-h-full"
          >
            <h2 className="text-xl font-bold mb-4">Cadastrar Nova Banca</h2>
            <Input
              name="numero"
              placeholder="Número da banca"
              required
              value={newNumero}
              onChange={(e) => {
                const val = e.target.value;
                setNewNumero(val);
                const exists = bancas.some(b => b.numero === val);
                setNumeroValido(!exists);
              }}
              className={numeroValido ? "border-green-500" : "border-red-500"}
            />
            <Input name="proprietario" placeholder="Nome do proprietário" />
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <Button type="submit" className="w-full sm:w-auto">Salvar</Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="w-full sm:w-auto">Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      {/* Formulário para cadastrar novo usuário, visível só para felipe@ipu.com */}
      {showUserRegisterForm && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleUserRegister}
            className="bg-white p-6 rounded-2xl w-full max-w-md space-y-4 shadow-lg overflow-auto max-h-full"
          >
            <h2 className="text-xl font-bold mb-4">Cadastrar Novo Usuário</h2>
            <Input
              type="email"
              name="email"
              placeholder="Email"
              required
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
            />
            <Input
              type="password"
              name="password"
              placeholder="Senha"
              required
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
            />
            <Input
              type="text"
              name="fullName"
              placeholder="Nome Completo"
              required
              value={newUserFullName}
              onChange={(e) => setNewUserFullName(e.target.value)}
            />
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <Button type="submit" className="w-full sm:w-auto">Cadastrar</Button>
              <Button variant="outline" onClick={() => setShowUserRegisterForm(false)} className="w-full sm:w-auto">Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      {/* Restante do código permanece igual */}
      {showDetails && selectedBanca && (() => {
        const now = new Date();
        const lastPaymentDate = selectedBanca.lastPayment ? new Date(selectedBanca.lastPayment) : null;
        let weeksLate = 0;
        let totalDue = 0;
        const aluguel = parseFloat(selectedBanca.aluguel) || 0;

        if (selectedBanca.status !== "Pago" && lastPaymentDate) {
          const diffTime = now.getTime() - lastPaymentDate.getTime();
          weeksLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
          if (weeksLate < 0) weeksLate = 0;
          totalDue = weeksLate * aluguel;
        }

        return (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
              <div className="bg-white p-6 rounded-2xl w-full max-w-md space-y-4 shadow-lg relative">
                <button
                  className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
                  onClick={() => setShowDetails(false)}
                >
                  &times;
                </button>
                <h2 className="text-xl font-bold mb-4">Detalhes da Banca</h2>
                <p><strong>Número da Banca:</strong> {selectedBanca.numero}</p>
                {selectedBanca.proprietario && (
                  <p><strong>Nome do Proprietário:</strong> {selectedBanca.proprietario}</p>
                )}
                <p><strong>Valor do Aluguel Semanal:</strong> R$ {aluguel.toFixed(2)}</p>
                <p><strong>Data do Comprovante:</strong> {now.toLocaleDateString()}</p>
                {selectedBanca.status === "Pago" ? (
                  <p><strong>Valor Pago:</strong> R$ 25,00</p>
                ) : (
                  <>
                    <p><strong>Semanas Atrasadas:</strong> {weeksLate}</p>
                    <p><strong>Valor Unitário da Semana:</strong> R$ 25,00</p>
                    <p><strong>Valor Total a Pagar:</strong> R$ {(weeksLate * 25).toFixed(2)}</p>
                  </>
                )}
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => {
                      printComprovante(selectedBanca);
                    }}
                  >
                    Imprimir Comprovante
                  </Button>
                </div>
              </div>
            </div>
          </>
        );
      })()}
      {isEditing && selectedBanca && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
          <form
            onSubmit={handleSalvarEdicao}
            className="bg-white p-6 rounded-2xl w-full max-w-md space-y-4 shadow-lg relative"
          >
            <button
              type="button"
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
              onClick={() => setIsEditing(false)}
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">Editar Banca</h2>
            <Input
              name="numero"
              placeholder="Número da banca"
              value={editNumero}
              onChange={(e) => setEditNumero(e.target.value)}
              required
            />
            <Input
              name="proprietario"
              placeholder="Nome do proprietário"
              value={editProprietario}
              onChange={(e) => setEditProprietario(e.target.value)}
              required
            />
            <Input
              name="aluguel"
              placeholder="Valor do aluguel semanal"
              type="number"
              step="0.01"
              value={editAluguel}
              onChange={(e) => setEditAluguel(e.target.value)}
              required
            />
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <Button type="submit" className="w-full sm:w-auto">Salvar</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

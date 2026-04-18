# DevBoard API 🚀

Um gerenciador de tarefas colaborativas de alta performance, construído com foco em tempo real e segurança. O sistema permite a organização de projetos em formato Kanban, com controle granular de permissões (RBAC) e notificações instantâneas via WebSockets.

## 📌 Funcionalidades Principais

- **Gestão de Projetos:** Criação e listagem de projetos com controle de acesso.
- **Kanban Dinâmico:** Movimentação de tarefas entre colunas (To-Do, In Progress, Done) com reordenação automática.
- **Tempo Real:** Atualizações instantâneas via Socket.io para todos os membros do projeto.
- **Segurança (RBAC):** Sistema de controle de acesso baseado em roles (Owner, Member).
- **Auditoria:** Log detalhado de todas as ações realizadas nas tarefas.
- **Paginação Eficiente:** Listagem de tarefas utilizando cursor-based pagination.

## 🛠 Tecnologias Utilizadas

- **Linguagem:** Node.js
- **Framework:** Express.js
- **ORM:** Prisma
- **Banco de Dados:** PostgreSQL (ou compatível)
- **Real-time:** Socket.io
- **Autenticação:** JWT (JSON Web Tokens)

## 🚀 Como Rodar o Projeto

### 1. Pré-requisitos

Certifique-se de ter instalado:

- [Node.js](https://nodejs.org/) (versão 18+)
- [PostgreSQL](https://www.postgresql.org/)

### 2. Instalação

Clone o repositório e instale as dependências:

```bash
git clone <seu-repositorio-url>
cd seu-projeto
npm install
```

### 3. Configuração

Crie um arquivo `.env` na raiz do projeto e configure suas variáveis:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco"
JWT_SECRET="seu_segredo_super_seguro"
PORT=3000
```

### 4. Banco de Dados

Execute as migrações do Prisma:

```bash
npx prisma migrate dev
```

### 5. Rodando o Servidor

```bash
npm run dev
```

## 🔌 API Endpoints (Principais)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/auth/register` | Cria um novo usuário |
| `POST` | `/auth/login` | Realiza autenticação |
| `GET` | `/tasks/project/:projectId` | Lista tarefas do projeto (com paginação) |
| `POST` | `/tasks` | Cria nova tarefa |
| `PATCH` | `/tasks/:id/move` | Move tarefa e reordena coluna |
| `DELETE` | `/tasks/:id` | Exclui tarefa e reajusta ordem |

## 🤝 Autor

Desenvolvido por Patric Augusto como parte do projeto de estudo de backend.
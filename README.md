# 🌸 Belezza — Sistema de Gestão de Salão de Beleza

Sistema completo para gestão de salões de beleza e manicure, com frontend moderno em HTML/CSS/JS e backend Python (Flask).

---

## 📁 Estrutura de arquivos

```
salon/
├── index.html               ← Entrada principal do sistema
├── static/
│   ├── css/
│   │   ├── main.css         ← Variáveis, reset, sidebar, topbar, layout
│   │   ├── components.css   ← Cards, botões, tabelas, modais, forms
│   │   └── pages.css        ← Estilos específicos de cada página
│   └── js/
│       ├── data.js          ← Dados mock e funções auxiliares
│       ├── components.js    ← Componentes reutilizáveis (toast, modal...)
│       ├── pages.js         ← Renderizadores de cada módulo
│       └── app.js           ← Roteador, navegação, inicialização
└── backend/
    ├── app.py               ← API Flask com todos os endpoints
    ├── requirements.txt     ← Dependências Python
    └── data.json            ← Banco de dados local (criado automaticamente)
```

---

## 🚀 Como rodar

### Opção 1 — Somente frontend (sem backend)
Abra o arquivo `index.html` diretamente no navegador.  
Todos os dados ficam em memória (perdem ao recarregar).

### Opção 2 — Com backend Python (dados persistentes)

```bash
# 1. Instalar dependências
cd backend
pip install -r requirements.txt

# 2. Iniciar o servidor
python app.py

# 3. Acessar no navegador
http://localhost:5000
```

---

## 🗂️ Módulos

| Módulo          | Descrição                                          |
|-----------------|----------------------------------------------------|
| Dashboard       | Faturamento, atendimentos, agenda e alertas        |
| Agenda          | Calendário diário com agendamentos e status        |
| Atendimento     | Controle de serviços realizados no dia             |
| PDV / Vendas    | Caixa rápido com carrinho e formas de pagamento    |
| Clientes        | Cadastro, histórico e observações                  |
| Profissionais   | Cadastro, comissões e serviços                     |
| Serviços        | Preços, duração e comissões por serviço            |
| Estoque         | Produtos, entradas/saídas e alertas de mínimo      |
| Financeiro      | Entradas, saídas, saldo e formas de pagamento      |
| Relatórios      | Faturamento, top serviços, profissionais, clientes |
| Configurações   | Salão, horários, usuários e WhatsApp               |

---

## 🎨 Tecnologias

- **Frontend:** HTML5, CSS3 (variáveis CSS), JavaScript ES6+ (vanilla)
- **Backend:** Python 3.10+, Flask, Flask-CORS
- **Banco de dados:** JSON local (fácil migrar para SQLite/PostgreSQL)
- **Fontes:** DM Sans + Playfair Display (Google Fonts)
- **Design:** Paleta rosa/roxo/branco, responsivo, mobile-first

---

## 🔌 API Endpoints

```
GET    /api/dashboard
GET    /api/clientes          ?busca=nome
POST   /api/clientes
PUT    /api/clientes/:id
DELETE /api/clientes/:id

GET    /api/profissionais
POST   /api/profissionais
PUT    /api/profissionais/:id

GET    /api/servicos          ?ativo=true
POST   /api/servicos
PUT    /api/servicos/:id

GET    /api/agendamentos      ?data=YYYY-MM-DD
POST   /api/agendamentos
PATCH  /api/agendamentos/:id/status

GET    /api/produtos          ?baixo=true
POST   /api/produtos
POST   /api/produtos/:id/entrada
POST   /api/produtos/:id/saida

GET    /api/transacoes        ?tipo=entrada|saida
POST   /api/transacoes

GET    /api/relatorios/faturamento  ?mes=YYYY-MM
GET    /api/relatorios/comissoes
```

---

## 📱 Responsivo

- Desktop: sidebar fixa + conteúdo ao lado
- Tablet: sidebar colapsável
- Mobile: sidebar deslizante com overlay

---

## 🔧 Próximos passos sugeridos

- [ ] Integrar banco de dados SQLite ou PostgreSQL com SQLAlchemy
- [ ] Adicionar autenticação (Flask-Login ou JWT)
- [ ] WhatsApp via Twilio ou Z-API
- [ ] Relatórios PDF com WeasyPrint
- [ ] PWA (Progressive Web App) para instalar no celular

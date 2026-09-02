"""
BELEZZA — Backend Flask API
Sistema de Gestão de Salão de Beleza
Banco: PostgreSQL via SQLAlchemy (Railway)
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from datetime import date
import bcrypt
import secrets

# ── Configuração ─────────────────────────────────────────
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))

def _find_base():
    # Candidatos em ordem de prioridade
    candidates = [
        os.path.dirname(_THIS_DIR),   # um nível acima (backend/../)
        _THIS_DIR,                     # mesmo diretório do app.py
        '/app',                        # Railpack padrão
        '/workspace',                  # alternativa Railway
    ]
    for d in candidates:
        if os.path.exists(os.path.join(d, 'login.html')):
            return d
        if os.path.exists(os.path.join(d, 'index.html')):
            return d
    return candidates[0]  # fallback

BASE_DIR = _find_base()

app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, 'static'),
    template_folder=BASE_DIR
)
CORS(app)

# DATABASE_URL é fornecida automaticamente pelo Railway
# Ex: postgresql://user:pass@host:port/dbname
DATABASE_URL = os.environ.get('DATABASE_URL', '')
# Railway às vezes retorna "postgres://" — SQLAlchemy exige "postgresql://"
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


# ═══════════════════════════════════════════════════════
# MODELOS
# ═══════════════════════════════════════════════════════

class Cliente(db.Model):
    __tablename__ = 'clientes'
    id            = db.Column(db.Integer, primary_key=True)
    nome          = db.Column(db.String(120), nullable=False)
    telefone      = db.Column(db.String(30), default='')
    email         = db.Column(db.String(120), default='')
    data_cadastro = db.Column(db.String(10), default=lambda: str(date.today()))
    ultima_visita = db.Column(db.String(10), default=lambda: str(date.today()))
    total_gasto   = db.Column(db.Float, default=0)
    visitas       = db.Column(db.Integer, default=0)
    observacoes   = db.Column(db.Text, default='')

    def to_dict(self):
        return {
            'id': self.id, 'nome': self.nome, 'telefone': self.telefone,
            'email': self.email, 'dataCadastro': self.data_cadastro,
            'ultimaVisita': self.ultima_visita, 'totalGasto': self.total_gasto,
            'visitas': self.visitas, 'observacoes': self.observacoes,
        }


class Profissional(db.Model):
    __tablename__ = 'profissionais'
    id                 = db.Column(db.Integer, primary_key=True)
    nome               = db.Column(db.String(120), nullable=False)
    funcao             = db.Column(db.String(80), default='')
    telefone           = db.Column(db.String(30), default='')
    comissao           = db.Column(db.Integer, default=40)
    atendimentos_mes   = db.Column(db.Integer, default=0)
    faturamento_mes    = db.Column(db.Float, default=0)
    status             = db.Column(db.String(20), default='ativo')

    def to_dict(self):
        return {
            'id': self.id, 'nome': self.nome, 'funcao': self.funcao,
            'telefone': self.telefone, 'comissao': self.comissao,
            'atendimentosMes': self.atendimentos_mes,
            'faturamentoMes': self.faturamento_mes, 'status': self.status,
        }


class Servico(db.Model):
    __tablename__ = 'servicos'
    id        = db.Column(db.Integer, primary_key=True)
    nome      = db.Column(db.String(120), nullable=False)
    categoria = db.Column(db.String(60), default='Outros')
    preco     = db.Column(db.Float, default=0)
    duracao   = db.Column(db.Integer, default=60)
    comissao  = db.Column(db.Integer, default=40)
    emoji     = db.Column(db.String(10), default='✨')
    ativo     = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id, 'nome': self.nome, 'categoria': self.categoria,
            'preco': self.preco, 'duracao': self.duracao,
            'comissao': self.comissao, 'emoji': self.emoji, 'ativo': self.ativo,
        }


class Produto(db.Model):
    __tablename__ = 'produtos'
    id        = db.Column(db.Integer, primary_key=True)
    nome      = db.Column(db.String(120), nullable=False)
    categoria = db.Column(db.String(60), default='')
    qtd       = db.Column(db.Integer, default=0)
    minimo    = db.Column(db.Integer, default=5)
    unidade   = db.Column(db.String(20), default='un')
    custo     = db.Column(db.Float, default=0)
    preco     = db.Column(db.Float, default=0)

    def to_dict(self):
        return {
            'id': self.id, 'nome': self.nome, 'categoria': self.categoria,
            'qtd': self.qtd, 'minimo': self.minimo, 'unidade': self.unidade,
            'custo': self.custo, 'preco': self.preco,
        }


class Agendamento(db.Model):
    __tablename__ = 'agendamentos'
    id          = db.Column(db.Integer, primary_key=True)
    cliente_id  = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    pro_id      = db.Column(db.Integer, db.ForeignKey('profissionais.id'), nullable=False)
    servico_id  = db.Column(db.Integer, db.ForeignKey('servicos.id'), nullable=False)
    data        = db.Column(db.String(10), nullable=False)
    hora        = db.Column(db.String(5), nullable=False)
    duracao     = db.Column(db.Integer, default=60)
    status      = db.Column(db.String(20), default='confirmado')
    valor       = db.Column(db.Float, default=0)
    obs         = db.Column(db.Text, default='')

    def to_dict(self):
        return {
            'id': self.id, 'clienteId': self.cliente_id, 'proId': self.pro_id,
            'servicoId': self.servico_id, 'data': self.data, 'hora': self.hora,
            'duracao': self.duracao, 'status': self.status,
            'valor': self.valor, 'obs': self.obs,
        }


class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id       = db.Column(db.Integer, primary_key=True)
    nome     = db.Column(db.String(120), nullable=False)
    usuario  = db.Column(db.String(60), unique=True, nullable=False)
    senha    = db.Column(db.String(200), nullable=False)  # bcrypt hash
    role     = db.Column(db.String(30), default='profissional')
    ativo    = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {'id': self.id, 'nome': self.nome,
                'usuario': self.usuario, 'role': self.role, 'ativo': self.ativo}


class Transacao(db.Model):
    __tablename__ = 'transacoes'
    id        = db.Column(db.Integer, primary_key=True)
    tipo      = db.Column(db.String(20), default='entrada')   # entrada | saida
    descricao = db.Column(db.String(200), default='')
    data      = db.Column(db.String(10), default=lambda: str(date.today()))
    valor     = db.Column(db.Float, default=0)
    forma     = db.Column(db.String(40), default='dinheiro')
    categoria = db.Column(db.String(60), default='outros')

    def to_dict(self):
        return {
            'id': self.id, 'tipo': self.tipo, 'descricao': self.descricao,
            'data': self.data, 'valor': self.valor,
            'forma': self.forma, 'categoria': self.categoria,
        }


# ── Cria tabelas e seed inicial ───────────────────────────
def seed():
    """Popula o banco com dados de exemplo se estiver vazio."""
    if Cliente.query.count() == 0:
        db.session.add_all([
            Cliente(nome='Ana Paula Ferreira', telefone='(11) 99234-5678',
                    email='ana@email.com', data_cadastro='2024-01-10',
                    ultima_visita='2025-08-28', total_gasto=1840, visitas=14,
                    observacoes='Alergia a acetona'),
            Cliente(nome='Beatriz Santos', telefone='(11) 98765-4321',
                    email='bea@email.com', data_cadastro='2024-03-15',
                    ultima_visita='2025-08-30', total_gasto=3200, visitas=28,
                    observacoes='Prefere horário manhã'),
        ])
    if Profissional.query.count() == 0:
        db.session.add_all([
            Profissional(nome='Camila Rocha', funcao='Manicure & Pedicure',
                         telefone='(11) 91234-5678', comissao=45,
                         atendimentos_mes=62, faturamento_mes=5580),
            Profissional(nome='Larissa Dias', funcao='Cabeleireira',
                         telefone='(11) 90987-6543', comissao=40,
                         atendimentos_mes=38, faturamento_mes=8320),
        ])
    if Servico.query.count() == 0:
        db.session.add_all([
            Servico(nome='Manicure simples', categoria='Unhas',
                    preco=40, duracao=45, comissao=45, emoji='💅'),
            Servico(nome='Pedicure simples', categoria='Unhas',
                    preco=50, duracao=60, comissao=45, emoji='🦶'),
            Servico(nome='Corte feminino', categoria='Cabelo',
                    preco=80, duracao=60, comissao=40, emoji='✂️'),
        ])
    if Produto.query.count() == 0:
        db.session.add_all([
            Produto(nome='Base coat Essie', categoria='Unhas',
                    qtd=3, minimo=5, unidade='un', custo=18, preco=45),
            Produto(nome='Acetona 1L', categoria='Unhas',
                    qtd=2, minimo=4, unidade='un', custo=12, preco=25),
        ])
    if Usuario.query.count() == 0:
        senha_hash = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode()
        db.session.add(Usuario(nome='Admin', usuario='admin', senha=senha_hash, role='gerente'))
        db.session.commit()


with app.app_context():
    db.create_all()   # cria tabelas se não existirem
    seed()            # insere dados de exemplo


# ── Helper ────────────────────────────────────────────────
def today():
    return str(date.today())


# ── Serve frontend ────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'login.html')


@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory(os.path.join(BASE_DIR, 'static'), path)


# ═══════════════════════════════════════════════════════
# API — AUTENTICAÇÃO
# ═══════════════════════════════════════════════════════

@app.route('/api/login', methods=['POST'])
def login():
    body = request.get_json()
    usuario = body.get('usuario', '').strip()
    senha   = body.get('senha', '').encode()
    u = Usuario.query.filter_by(usuario=usuario, ativo=True).first()
    if not u or not bcrypt.checkpw(senha, u.senha.encode()):
        return jsonify({'erro': 'Usuário ou senha incorretos'}), 401
    token = secrets.token_hex(32)
    return jsonify({'ok': True, 'token': token, 'usuario': u.to_dict()})


@app.route('/api/usuarios', methods=['GET'])
def get_usuarios():
    return jsonify([u.to_dict() for u in Usuario.query.all()])


@app.route('/api/usuarios', methods=['POST'])
def create_usuario():
    body = request.get_json()
    if not body.get('usuario') or not body.get('senha'):
        return jsonify({'erro': 'Usuario e senha obrigatorios'}), 400
    if Usuario.query.filter_by(usuario=body['usuario']).first():
        return jsonify({'erro': 'Usuario ja existe'}), 409
    senha_hash = bcrypt.hashpw(body['senha'].encode(), bcrypt.gensalt()).decode()
    u = Usuario(
        nome=body.get('nome', body['usuario']),
        usuario=body['usuario'],
        senha=senha_hash,
        role=body.get('role', 'profissional'),
    )
    db.session.add(u)
    db.session.commit()
    return jsonify(u.to_dict()), 201


@app.route('/api/usuarios/<int:id>/senha', methods=['PATCH'])
def change_senha(id):
    u = Usuario.query.get_or_404(id)
    body = request.get_json()
    nova = body.get('senha', '')
    if len(nova) < 6:
        return jsonify({'erro': 'Senha muito curta (mínimo 6 caracteres)'}), 400
    u.senha = bcrypt.hashpw(nova.encode(), bcrypt.gensalt()).decode()
    db.session.commit()
    return jsonify({'ok': True})


# ═══════════════════════════════════════════════════════
# API — CLIENTES
# ═══════════════════════════════════════════════════════

@app.route('/api/clientes', methods=['GET'])
def get_clientes():
    busca = request.args.get('busca', '').lower()
    q = Cliente.query
    if busca:
        q = q.filter(
            db.or_(
                Cliente.nome.ilike(f'%{busca}%'),
                Cliente.email.ilike(f'%{busca}%'),
                Cliente.telefone.ilike(f'%{busca}%'),
            )
        )
    return jsonify([c.to_dict() for c in q.all()])


@app.route('/api/clientes/<int:id>', methods=['GET'])
def get_cliente(id):
    c = Cliente.query.get_or_404(id, description='Cliente não encontrado')
    historico = [a.to_dict() for a in Agendamento.query.filter_by(cliente_id=id).all()]
    return jsonify({**c.to_dict(), 'historico': historico})


@app.route('/api/clientes', methods=['POST'])
def create_cliente():
    body = request.get_json()
    if not body.get('nome'):
        return jsonify({'erro': 'Nome obrigatório'}), 400
    c = Cliente(
        nome=body['nome'],
        telefone=body.get('telefone', ''),
        email=body.get('email', ''),
        observacoes=body.get('observacoes', ''),
    )
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201


@app.route('/api/clientes/<int:id>', methods=['PUT'])
def update_cliente(id):
    c = Cliente.query.get_or_404(id)
    body = request.get_json()
    for k, v in body.items():
        campo = {'dataCadastro': 'data_cadastro', 'ultimaVisita': 'ultima_visita',
                 'totalGasto': 'total_gasto'}.get(k, k)
        if hasattr(c, campo) and campo != 'id':
            setattr(c, campo, v)
    db.session.commit()
    return jsonify(c.to_dict())


@app.route('/api/clientes/<int:id>', methods=['DELETE'])
def delete_cliente(id):
    c = Cliente.query.get_or_404(id)
    db.session.delete(c)
    db.session.commit()
    return jsonify({'ok': True})


# ═══════════════════════════════════════════════════════
# API — PROFISSIONAIS
# ═══════════════════════════════════════════════════════

@app.route('/api/profissionais', methods=['GET'])
def get_profissionais():
    return jsonify([p.to_dict() for p in Profissional.query.all()])


@app.route('/api/profissionais', methods=['POST'])
def create_profissional():
    body = request.get_json()
    if not body.get('nome'):
        return jsonify({'erro': 'Nome obrigatório'}), 400
    p = Profissional(
        nome=body['nome'],
        funcao=body.get('funcao', ''),
        telefone=body.get('telefone', ''),
        comissao=int(body.get('comissao', 40)),
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@app.route('/api/profissionais/<int:id>', methods=['PUT'])
def update_profissional(id):
    p = Profissional.query.get_or_404(id)
    body = request.get_json()
    mapa = {'atendimentosMes': 'atendimentos_mes', 'faturamentoMes': 'faturamento_mes'}
    for k, v in body.items():
        campo = mapa.get(k, k)
        if hasattr(p, campo) and campo != 'id':
            setattr(p, campo, v)
    db.session.commit()
    return jsonify(p.to_dict())


# ═══════════════════════════════════════════════════════
# API — SERVIÇOS
# ═══════════════════════════════════════════════════════

@app.route('/api/servicos', methods=['GET'])
def get_servicos():
    q = Servico.query
    if request.args.get('ativo') == 'true':
        q = q.filter_by(ativo=True)
    return jsonify([s.to_dict() for s in q.all()])


@app.route('/api/servicos', methods=['POST'])
def create_servico():
    body = request.get_json()
    s = Servico(
        nome=body.get('nome', ''),
        categoria=body.get('categoria', 'Outros'),
        preco=float(body.get('preco', 0)),
        duracao=int(body.get('duracao', 60)),
        comissao=int(body.get('comissao', 40)),
        emoji=body.get('emoji', '✨'),
    )
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@app.route('/api/servicos/<int:id>', methods=['PUT'])
def update_servico(id):
    s = Servico.query.get_or_404(id)
    body = request.get_json()
    for k, v in body.items():
        if hasattr(s, k) and k != 'id':
            setattr(s, k, v)
    db.session.commit()
    return jsonify(s.to_dict())


# ═══════════════════════════════════════════════════════
# API — AGENDAMENTOS
# ═══════════════════════════════════════════════════════

def _enrich(a):
    d = a.to_dict()
    c  = Cliente.query.get(a.cliente_id)
    pr = Profissional.query.get(a.pro_id)
    sv = Servico.query.get(a.servico_id)
    d['clienteNome'] = c.nome  if c  else ''
    d['profNome']    = pr.nome if pr else ''
    d['servicoNome'] = sv.nome if sv else ''
    return d


@app.route('/api/agendamentos', methods=['GET'])
def get_agendamentos():
    q = Agendamento.query
    data_filtro = request.args.get('data')
    if data_filtro:
        q = q.filter_by(data=data_filtro)
    agendamentos = sorted(q.all(), key=lambda a: (a.data, a.hora))
    return jsonify([_enrich(a) for a in agendamentos])


@app.route('/api/agendamentos/hoje', methods=['GET'])
def get_agenda_hoje():
    agendamentos = Agendamento.query.filter_by(data=today()).all()
    return jsonify([_enrich(a) for a in agendamentos])


@app.route('/api/agendamentos', methods=['POST'])
def create_agendamento():
    body = request.get_json()
    for field in ['clienteId', 'proId', 'servicoId', 'data', 'hora']:
        if field not in body:
            return jsonify({'erro': f'{field} obrigatório'}), 400
    serv = Servico.query.get(body['servicoId'])
    a = Agendamento(
        cliente_id=body['clienteId'],
        pro_id=body['proId'],
        servico_id=body['servicoId'],
        data=body['data'],
        hora=body['hora'],
        duracao=serv.duracao if serv else 60,
        valor=serv.preco if serv else 0,
        obs=body.get('obs', ''),
    )
    db.session.add(a)
    db.session.commit()
    return jsonify(_enrich(a)), 201


@app.route('/api/agendamentos/<int:id>/status', methods=['PATCH'])
def update_status(id):
    a = Agendamento.query.get_or_404(id)
    body = request.get_json()
    status = body.get('status')
    if status not in ('confirmado', 'pendente', 'finalizado', 'cancelado'):
        return jsonify({'erro': 'Status inválido'}), 400
    a.status = status
    if status == 'finalizado':
        cli = Cliente.query.get(a.cliente_id)
        if cli:
            cli.total_gasto += a.valor
            cli.visitas += 1
            cli.ultima_visita = today()
        db.session.add(Transacao(
            tipo='entrada',
            descricao=f'Atendimento #{id}',
            data=today(),
            valor=a.valor,
            forma=body.get('formaPgto', 'dinheiro'),
            categoria='servico',
        ))
    db.session.commit()
    return jsonify(_enrich(a))


# ═══════════════════════════════════════════════════════
# API — PRODUTOS / ESTOQUE
# ═══════════════════════════════════════════════════════

@app.route('/api/produtos', methods=['GET'])
def get_produtos():
    q = Produto.query
    if request.args.get('baixo') == 'true':
        q = q.filter(Produto.qtd <= Produto.minimo)
    return jsonify([p.to_dict() for p in q.all()])


@app.route('/api/produtos', methods=['POST'])
def create_produto():
    body = request.get_json()
    p = Produto(
        nome=body.get('nome', ''),
        categoria=body.get('categoria', ''),
        qtd=int(body.get('qtd', 0)),
        minimo=int(body.get('minimo', 5)),
        unidade=body.get('unidade', 'un'),
        custo=float(body.get('custo', 0)),
        preco=float(body.get('preco', 0)),
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@app.route('/api/produtos/<int:id>/entrada', methods=['POST'])
def entrada_estoque(id):
    p = Produto.query.get_or_404(id)
    qty = int(request.get_json().get('qtd', 0))
    if qty <= 0:
        return jsonify({'erro': 'Quantidade inválida'}), 400
    p.qtd += qty
    db.session.commit()
    return jsonify({'produto': p.to_dict(), 'qtdAdicionada': qty})


@app.route('/api/produtos/<int:id>/saida', methods=['POST'])
def saida_estoque(id):
    p = Produto.query.get_or_404(id)
    qty = int(request.get_json().get('qtd', 0))
    if qty <= 0 or qty > p.qtd:
        return jsonify({'erro': 'Quantidade inválida ou insuficiente'}), 400
    p.qtd -= qty
    db.session.commit()
    return jsonify({'produto': p.to_dict(), 'qtdRetirada': qty})


# ═══════════════════════════════════════════════════════
# API — FINANCEIRO
# ═══════════════════════════════════════════════════════

@app.route('/api/transacoes', methods=['GET'])
def get_transacoes():
    q = Transacao.query
    tipo = request.args.get('tipo')
    if tipo:
        q = q.filter_by(tipo=tipo)
    return jsonify([t.to_dict() for t in q.order_by(Transacao.data.desc()).all()])


@app.route('/api/transacoes', methods=['POST'])
def create_transacao():
    body = request.get_json()
    t = Transacao(
        tipo=body.get('tipo', 'entrada'),
        descricao=body.get('descricao', ''),
        data=body.get('data', today()),
        valor=float(body.get('valor', 0)),
        forma=body.get('forma', 'dinheiro'),
        categoria=body.get('categoria', 'outros'),
    )
    db.session.add(t)
    db.session.commit()
    return jsonify(t.to_dict()), 201


# ═══════════════════════════════════════════════════════
# API — DASHBOARD
# ═══════════════════════════════════════════════════════

@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    hoje = today()
    mes  = hoje[:7]

    agenda_hoje  = Agendamento.query.filter_by(data=hoje).all()
    confirmados  = [a for a in agenda_hoje if a.status == 'confirmado']
    fat_hoje     = sum(a.valor for a in confirmados)

    fat_mes = db.session.query(db.func.sum(Transacao.valor)).filter(
        Transacao.tipo == 'entrada',
        Transacao.data.like(f'{mes}%')
    ).scalar() or 0

    produtos_baixos = Produto.query.filter(Produto.qtd <= Produto.minimo).all()

    return jsonify({
        'atendimentosHoje':  len(agenda_hoje),
        'confirmadosHoje':   len(confirmados),
        'faturamentoHoje':   fat_hoje,
        'faturamentoMes':    fat_mes,
        'totalClientes':     Cliente.query.count(),
        'estoqueBaixo':      len(produtos_baixos),
        'agendaHoje':        [_enrich(a) for a in agenda_hoje[:6]],
        'produtosBaixos':    [p.to_dict() for p in produtos_baixos],
    })


# ═══════════════════════════════════════════════════════
# API — RELATÓRIOS
# ═══════════════════════════════════════════════════════

@app.route('/api/relatorios/faturamento', methods=['GET'])
def relatorio_faturamento():
    mes = request.args.get('mes', today()[:7])

    def soma(tipo):
        return db.session.query(db.func.sum(Transacao.valor)).filter(
            Transacao.tipo == tipo,
            Transacao.data.like(f'{mes}%')
        ).scalar() or 0

    def qtd(tipo):
        return Transacao.query.filter(
            Transacao.tipo == tipo,
            Transacao.data.like(f'{mes}%')
        ).count()

    entradas = soma('entrada')
    saidas   = soma('saida')
    return jsonify({
        'mes': mes,
        'totalEntradas':   entradas,
        'totalSaidas':     saidas,
        'saldo':           entradas - saidas,
        'qtdTransacoes':   qtd('entrada') + qtd('saida'),
    })


@app.route('/api/relatorios/comissoes', methods=['GET'])
def relatorio_comissoes():
    comissoes = []
    for p in Profissional.query.all():
        comissoes.append({
            'profissional':  p.nome,
            'atendimentos':  p.atendimentos_mes,
            'faturamento':   p.faturamento_mes,
            'comissaoPct':   p.comissao,
            'valorComissao': p.faturamento_mes * p.comissao / 100,
        })
    return jsonify(sorted(comissoes, key=lambda x: x['valorComissao'], reverse=True))


# ═══════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════

if __name__ == '__main__':
    print("🌸 Belezza — Sistema de Gestão iniciando...")
    print(f"   Frontend: http://localhost:5000")
    print(f"   API:      http://localhost:5000/api")
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, port=port, host='0.0.0.0')

"""
BELEZZA — Backend Flask API
Sistema de Gestão de Salão de Beleza
Banco: PostgreSQL via SQLAlchemy (Railway)
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
import json
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

# ── Diretório de uploads ──────────────────────────────────
# No Railway: use Volume montado em /data para persistência entre deploys
# Defina o Volume no Railway com Mount Path: /data
_VOLUME_PATH = '/data/uploads'
if os.path.isdir('/data'):
    UPLOAD_DIR = _VOLUME_PATH
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    print(f"📁 Upload dir (volume): {UPLOAD_DIR}")
else:
    UPLOAD_DIR = os.path.join(BASE_DIR, 'static', 'uploads')
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    print(f"📁 Upload dir (local): {UPLOAD_DIR}")

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
    nome_social   = db.Column(db.String(120), default='')
    telefone      = db.Column(db.String(30), default='')
    telefone_fixo = db.Column(db.String(30), default='')
    email         = db.Column(db.String(120), default='')
    sexo          = db.Column(db.String(1), default='')
    data_nascimento = db.Column(db.String(10), default='')
    data_cadastro = db.Column(db.String(10), default=lambda: str(date.today()))
    ultima_visita = db.Column(db.String(10), default=lambda: str(date.today()))
    total_gasto   = db.Column(db.Float, default=0)
    visitas       = db.Column(db.Integer, default=0)
    observacoes   = db.Column(db.Text, default='')
    obs_interna   = db.Column(db.Text, default='')
    # Endereço
    cep           = db.Column(db.String(10), default='')
    rua           = db.Column(db.String(200), default='')
    numero        = db.Column(db.String(20), default='')
    complemento   = db.Column(db.String(100), default='')
    bairro        = db.Column(db.String(100), default='')
    cidade        = db.Column(db.String(100), default='')
    estado        = db.Column(db.String(2), default='')
    # Preferências
    origem        = db.Column(db.String(30), default='')
    prof_pref     = db.Column(db.Text, default='')   # JSON lista de ids
    serv_pref     = db.Column(db.Text, default='')   # JSON lista de ids
    hora_pref     = db.Column(db.String(50), default='')
    esmalte_pref  = db.Column(db.String(100), default='')
    cor_pref      = db.Column(db.String(100), default='')
    tipo_unha     = db.Column(db.String(50), default='')
    obs_cabelo    = db.Column(db.Text, default='')
    foto          = db.Column(db.String(300), default='')

    def to_dict(self):
        return {
            'id': self.id, 'nome': self.nome, 'nomeSocial': self.nome_social,
            'telefone': self.telefone, 'telefoneFixo': self.telefone_fixo,
            'email': self.email, 'sexo': self.sexo,
            'dataNascimento': self.data_nascimento,
            'dataCadastro': self.data_cadastro,
            'ultimaVisita': self.ultima_visita,
            'totalGasto': self.total_gasto, 'visitas': self.visitas,
            'observacoes': self.observacoes, 'obsInterna': self.obs_interna,
            'cep': self.cep, 'rua': self.rua, 'numero': self.numero,
            'complemento': self.complemento, 'bairro': self.bairro,
            'cidade': self.cidade, 'estado': self.estado,
            'origem': self.origem, 'profPref': self.prof_pref,
            'servPref': self.serv_pref, 'horaPref': self.hora_pref,
            'esmalte': self.esmalte_pref, 'cor': self.cor_pref,
            'tipoUnha': self.tipo_unha, 'obsCabelo': self.obs_cabelo,
            'foto': self.foto,
        }


class Profissional(db.Model):
    __tablename__ = 'profissionais'
    id                 = db.Column(db.Integer, primary_key=True)
    nome               = db.Column(db.String(120), nullable=False)
    nome_social        = db.Column(db.String(120), default='')
    funcao             = db.Column(db.String(80),  default='')
    telefone           = db.Column(db.String(30),  default='')
    telefone_fixo      = db.Column(db.String(30),  default='')
    email              = db.Column(db.String(120), default='')
    sexo               = db.Column(db.String(1),   default='')
    data_nascimento    = db.Column(db.String(10),  default='')
    cpf                = db.Column(db.String(20),  default='')
    rg                 = db.Column(db.String(20),  default='')
    orgao_emissor      = db.Column(db.String(30),  default='')
    data_emissao       = db.Column(db.String(10),  default='')
    cep                = db.Column(db.String(10),  default='')
    rua                = db.Column(db.String(200), default='')
    numero             = db.Column(db.String(20),  default='')
    complemento        = db.Column(db.String(100), default='')
    bairro             = db.Column(db.String(100), default='')
    cidade             = db.Column(db.String(100), default='')
    estado             = db.Column(db.String(2),   default='')
    origem             = db.Column(db.String(30),  default='')
    obs                = db.Column(db.Text,        default='')
    foto               = db.Column(db.String(300), default='')
    comissao           = db.Column(db.Float,       default=0)
    tipo_comissao      = db.Column(db.String(20),  default='percentual')
    atendimentos_mes   = db.Column(db.Integer,     default=0)
    faturamento_mes    = db.Column(db.Float,       default=0)
    status             = db.Column(db.String(20),  default='ativo')
    ativo              = db.Column(db.Boolean,     default=True)
    data_cadastro      = db.Column(db.String(10),  default=lambda: str(date.today()))

    def to_dict(self):
        return {
            'id':              self.id,
            'nome':            self.nome,
            'nome_social':     self.nome_social      or '',
            'funcao':          self.funcao            or '',
            'telefone':        self.telefone          or '',
            'telefone_fixo':   self.telefone_fixo     or '',
            'email':           self.email             or '',
            'sexo':            self.sexo              or '',
            'data_nascimento': self.data_nascimento   or '',
            'cpf':             self.cpf               or '',
            'rg':              self.rg                or '',
            'orgao_emissor':   self.orgao_emissor     or '',
            'data_emissao':    self.data_emissao      or '',
            'cep':             self.cep               or '',
            'rua':             self.rua               or '',
            'numero':          self.numero            or '',
            'complemento':     self.complemento       or '',
            'bairro':          self.bairro            or '',
            'cidade':          self.cidade            or '',
            'estado':          self.estado            or '',
            'origem':          self.origem            or '',
            'obs':             self.obs               or '',
            'foto':            self.foto              or '',
            'comissao':        self.comissao          or 0,
            'tipo_comissao':   self.tipo_comissao     or 'percentual',
            'atendimentosMes': self.atendimentos_mes  or 0,
            'faturamentoMes':  self.faturamento_mes   or 0,
            'status':          self.status            or 'ativo',
            'ativo':           self.ativo if self.ativo is not None else True,
            'data_cadastro':   self.data_cadastro     or '',
        }


class Servico(db.Model):
    __tablename__ = 'servicos'
    id                 = db.Column(db.Integer, primary_key=True)
    nome               = db.Column(db.String(120), nullable=False)
    categoria          = db.Column(db.String(60),  default='Outros')
    descricao          = db.Column(db.Text,         default='')
    preco              = db.Column(db.Float,        default=0)
    duracao            = db.Column(db.Integer,      default=60)
    comissao           = db.Column(db.Float,        default=20)
    tipo_comissao      = db.Column(db.String(20),   default='percentual')
    emoji              = db.Column(db.String(10),   default='✨')
    foto               = db.Column(db.String(300),  default='')
    ativo              = db.Column(db.Boolean,      default=True)
    obs                = db.Column(db.Text,         default='')
    # JSON serializado — profissionais habilitados e produtos utilizados
    profissionais_ids  = db.Column(db.Text,         default='[]')
    produtos_json      = db.Column(db.Text,         default='[]')

    def to_dict(self):
        import json
        def parse(v):
            try: return json.loads(v or '[]')
            except: return []
        return {
            'id':               self.id,
            'nome':             self.nome               or '',
            'categoria':        self.categoria          or '',
            'descricao':        self.descricao          or '',
            'preco':            self.preco              or 0,
            'duracao':          self.duracao            or 60,
            'comissao':         self.comissao           or 0,
            'tipo_comissao':    self.tipo_comissao      or 'percentual',
            'emoji':            self.emoji              or '✨',
            'foto':             self.foto               or '',
            'ativo':            self.ativo if self.ativo is not None else True,
            'obs':              self.obs                or '',
            'profissionais_ids': parse(self.profissionais_ids),
            'produtos_utilizados': parse(self.produtos_json),
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
    hora_fim    = db.Column(db.String(5), default='')
    duracao     = db.Column(db.Integer, default=60)
    status      = db.Column(db.String(20), default='confirmado')
    valor       = db.Column(db.Float, default=0)
    obs         = db.Column(db.Text, default='')
    forma_pgto       = db.Column(db.String(30), default='')
    tipo_atendimento = db.Column(db.String(20), default='presencial')
    desconto         = db.Column(db.Float, default=0)

    def to_dict(self):
        return {
            'id': self.id, 'clienteId': self.cliente_id, 'proId': self.pro_id,
            'servicoId': self.servico_id, 'data': self.data, 'hora': self.hora,
            'hora_fim': self.hora_fim or '', 'duracao': self.duracao,
            'status': self.status, 'valor': self.valor, 'obs': self.obs,
            'formaPgto': self.forma_pgto or '',
            'tipoAtendimento': self.tipo_atendimento or 'presencial',
            'desconto': self.desconto or 0,
        }


class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id             = db.Column(db.Integer, primary_key=True)
    nome           = db.Column(db.String(120), nullable=False)
    usuario        = db.Column(db.String(60), unique=True, nullable=False)
    senha          = db.Column(db.String(200), nullable=False)
    email          = db.Column(db.String(120), default='')
    telefone       = db.Column(db.String(30), default='')
    role           = db.Column(db.String(30), default='profissional')
    ativo          = db.Column(db.Boolean, default=True)
    senha_padrao   = db.Column(db.Boolean, default=True)
    permissoes     = db.Column(db.Text, default='dashboard,agenda,clientes,servicos,profissionais,atendimentos,pdv,estoque,financeiro,relatorios,configuracoes')
    data_cadastro  = db.Column(db.String(20), default=lambda: str(date.today()))
    foto           = db.Column(db.String(200), default='')

    def to_dict(self):
        return {
            'id': self.id, 'nome': self.nome, 'usuario': self.usuario,
            'email': self.email or '', 'telefone': self.telefone or '',
            'role': self.role, 'ativo': self.ativo,
            'permissoes': (self.permissoes or '').split(','),
            'data_cadastro': self.data_cadastro or '',
            'foto': self.foto or '',
        }



class PerfilAcesso(db.Model):
    __tablename__ = 'perfis_acesso'
    id          = db.Column(db.Integer, primary_key=True)
    nome        = db.Column(db.String(80), nullable=False)
    descricao   = db.Column(db.String(200), default='')
    padrao      = db.Column(db.Boolean, default=False)
    ativo       = db.Column(db.Boolean, default=True)
    # Permissões por módulo: JSON com visualizar/incluir/editar/excluir/imprimir/exportar
    permissoes  = db.Column(db.Text, default='{}')
    data_criacao = db.Column(db.String(20), default=lambda: str(date.today()))

    def to_dict(self):
        import json
        try:
            perms = json.loads(self.permissoes or '{}')
        except:
            perms = {}
        return {
            'id': self.id, 'nome': self.nome, 'descricao': self.descricao or '',
            'padrao': self.padrao, 'ativo': self.ativo,
            'permissoes': perms, 'data_criacao': self.data_criacao or '',
        }



class FormaPagamento(db.Model):
    __tablename__ = 'formas_pagamento'
    id              = db.Column(db.Integer, primary_key=True)
    nome            = db.Column(db.String(80), nullable=False)
    tipo            = db.Column(db.String(30), default='outros')  # dinheiro|pix|cartao|transferencia|outros
    taxa            = db.Column(db.Float, default=0.0)
    parcelamento    = db.Column(db.Boolean, default=False)
    max_parcelas    = db.Column(db.Integer, default=1)
    conta_destino   = db.Column(db.String(80), default='')
    ativo           = db.Column(db.Boolean, default=True)
    data_cadastro   = db.Column(db.String(20), default=lambda: str(date.today()))

    def to_dict(self):
        return {
            'id': self.id, 'nome': self.nome, 'tipo': self.tipo,
            'taxa': self.taxa, 'parcelamento': self.parcelamento,
            'max_parcelas': self.max_parcelas, 'conta_destino': self.conta_destino or '',
            'ativo': self.ativo, 'data_cadastro': self.data_cadastro or '',
        }


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

    # Seed perfis de acesso
    if PerfilAcesso.query.count() == 0:
        perfis_seed = [
            {'nome':'Administrador','descricao':'Acesso total ao sistema','padrao':True,'ativo':True,'permissoes':'{"dashboard": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "agenda": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "clientes": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "servicos": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "profissionais": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "atendimentos": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "pdv": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "estoque": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "financeiro": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "relatorios": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "configuracoes": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}}'},
            {'nome':'Gerente','descricao':'Gerencia o salão e equipe','padrao':False,'ativo':True,'permissoes':'{"dashboard": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "agenda": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "clientes": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "servicos": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "profissionais": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "atendimentos": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "pdv": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "estoque": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "financeiro": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "relatorios": {"visualizar": true, "incluir": true, "editar": true, "excluir": true, "imprimir": true, "exportar": true}, "configuracoes": {"visualizar": true, "incluir": true, "editar": true, "excluir": false, "imprimir": true, "exportar": true}}'},
            {'nome':'Recepcionista','descricao':'Agenda clientes e atendimentos','padrao':False,'ativo':True,'permissoes':'{"dashboard": {"visualizar": true, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "agenda": {"visualizar": true, "incluir": true, "editar": true, "excluir": false, "imprimir": false, "exportar": false}, "clientes": {"visualizar": true, "incluir": true, "editar": true, "excluir": false, "imprimir": false, "exportar": false}, "servicos": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "profissionais": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "atendimentos": {"visualizar": true, "incluir": true, "editar": true, "excluir": false, "imprimir": false, "exportar": false}, "pdv": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "estoque": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "financeiro": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "relatorios": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "configuracoes": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}}'},
            {'nome':'Profissional','descricao':'Acesso aos atendimentos','padrao':False,'ativo':True,'permissoes':'{"dashboard": {"visualizar": true, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "agenda": {"visualizar": true, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "clientes": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "servicos": {"visualizar": true, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "profissionais": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "atendimentos": {"visualizar": true, "incluir": true, "editar": true, "excluir": false, "imprimir": false, "exportar": false}, "pdv": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "estoque": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "financeiro": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "relatorios": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}, "configuracoes": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": false, "exportar": false}}'},
            {'nome':'Caixa','descricao':'Acesso ao PDV e financeiro','padrao':False,'ativo':True,'permissoes':'{"dashboard": {"visualizar": true, "incluir": false, "editar": false, "excluir": false, "imprimir": true, "exportar": false}, "agenda": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": true, "exportar": false}, "clientes": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": true, "exportar": false}, "servicos": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": true, "exportar": false}, "profissionais": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": true, "exportar": false}, "atendimentos": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": true, "exportar": false}, "pdv": {"visualizar": true, "incluir": true, "editar": true, "excluir": false, "imprimir": true, "exportar": false}, "estoque": {"visualizar": true, "incluir": false, "editar": false, "excluir": false, "imprimir": true, "exportar": false}, "financeiro": {"visualizar": true, "incluir": true, "editar": false, "excluir": false, "imprimir": true, "exportar": true}, "relatorios": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": true, "exportar": false}, "configuracoes": {"visualizar": false, "incluir": false, "editar": false, "excluir": false, "imprimir": true, "exportar": false}}'},
        ]
        for p in perfis_seed:
            db.session.add(PerfilAcesso(**p))
        db.session.commit()
        print("✅ Seed: perfis de acesso criados.")


    # Seed formas de pagamento
    if FormaPagamento.query.count() == 0:
        fps = [
            FormaPagamento(nome='Dinheiro',            tipo='dinheiro',      taxa=0.0,  parcelamento=False, max_parcelas=1,  ativo=True),
            FormaPagamento(nome='PIX',                 tipo='pix',           taxa=0.0,  parcelamento=False, max_parcelas=1,  ativo=True),
            FormaPagamento(nome='Cartão de Débito',    tipo='cartao',        taxa=1.5,  parcelamento=False, max_parcelas=1,  ativo=True),
            FormaPagamento(nome='Cartão de Crédito',   tipo='cartao',        taxa=3.5,  parcelamento=True,  max_parcelas=12, ativo=True),
            FormaPagamento(nome='Transferência Bancária', tipo='transferencia', taxa=0.0, parcelamento=False, max_parcelas=1, ativo=True),
            FormaPagamento(nome='Fiado',               tipo='outros',        taxa=0.0,  parcelamento=False, max_parcelas=1,  ativo=False),
        ]
        for fp in fps:
            db.session.add(fp)
        db.session.commit()
        print("✅ Seed: formas de pagamento criadas.")

    if Usuario.query.count() == 0:
        senha_hash = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode()
        db.session.add(Usuario(nome='Admin', usuario='admin', senha=senha_hash,
                               role='gerente', senha_padrao=True))
        db.session.commit()


def migrate():
    """Adiciona colunas novas em tabelas existentes sem derrubar dados."""
    cols_usuarios = [
        ("senha_padrao",  "BOOLEAN DEFAULT TRUE"),
        ("email",         "VARCHAR(120) DEFAULT ''"),
        ("telefone",      "VARCHAR(30) DEFAULT ''"),
        ("permissoes",    "TEXT DEFAULT 'dashboard,agenda,clientes,servicos,profissionais,atendimentos,pdv,estoque,financeiro,relatorios,configuracoes'"),
        ("data_cadastro", "VARCHAR(20) DEFAULT ''"),
        ("foto",         "VARCHAR(200) DEFAULT ''"),
    ]
    cols_perfis = [
        ("data_criacao", "VARCHAR(20) DEFAULT ''"),
    ]
    cols_agendamentos = [
        ("hora_fim",         "VARCHAR(5)  DEFAULT ''"),
        ("forma_pgto",       "VARCHAR(30) DEFAULT ''"),
        ("tipo_atendimento", "VARCHAR(20) DEFAULT 'presencial'"),
        ("desconto",         "FLOAT       DEFAULT 0"),
    ]
    cols_servicos = [
        ("descricao",       "TEXT        DEFAULT ''"),
        ("tipo_comissao",   "VARCHAR(20) DEFAULT 'percentual'"),
        ("foto",            "VARCHAR(300) DEFAULT ''"),
        ("obs",             "TEXT        DEFAULT ''"),
        ("profissionais_ids","TEXT       DEFAULT '[]'"),
        ("produtos_json",   "TEXT        DEFAULT '[]'"),
    ]
    cols_profissionais = [
        ("nome_social",     "VARCHAR(120) DEFAULT ''"),
        ("telefone_fixo",   "VARCHAR(30)  DEFAULT ''"),
        ("email",           "VARCHAR(120) DEFAULT ''"),
        ("sexo",            "VARCHAR(1)   DEFAULT ''"),
        ("data_nascimento", "VARCHAR(10)  DEFAULT ''"),
        ("cpf",             "VARCHAR(20)  DEFAULT ''"),
        ("rg",              "VARCHAR(20)  DEFAULT ''"),
        ("orgao_emissor",   "VARCHAR(30)  DEFAULT ''"),
        ("data_emissao",    "VARCHAR(10)  DEFAULT ''"),
        ("cep",             "VARCHAR(10)  DEFAULT ''"),
        ("rua",             "VARCHAR(200) DEFAULT ''"),
        ("numero",          "VARCHAR(20)  DEFAULT ''"),
        ("complemento",     "VARCHAR(100) DEFAULT ''"),
        ("bairro",          "VARCHAR(100) DEFAULT ''"),
        ("cidade",          "VARCHAR(100) DEFAULT ''"),
        ("estado",          "VARCHAR(2)   DEFAULT ''"),
        ("origem",          "VARCHAR(30)  DEFAULT ''"),
        ("obs",             "TEXT         DEFAULT ''"),
        ("foto",            "VARCHAR(300) DEFAULT ''"),
        ("tipo_comissao",   "VARCHAR(20)  DEFAULT 'percentual'"),
        ("ativo",           "BOOLEAN      DEFAULT TRUE"),
        ("data_cadastro",   "VARCHAR(10)  DEFAULT ''"),
    ]
    cols_clientes = [
        ("nome_social",    "VARCHAR(120) DEFAULT ''"),
        ("telefone_fixo",  "VARCHAR(30) DEFAULT ''"),
        ("sexo",           "VARCHAR(1) DEFAULT ''"),
        ("data_nascimento","VARCHAR(10) DEFAULT ''"),
        ("obs_interna",    "TEXT DEFAULT ''"),
        ("cep",            "VARCHAR(10) DEFAULT ''"),
        ("rua",            "VARCHAR(200) DEFAULT ''"),
        ("numero",         "VARCHAR(20) DEFAULT ''"),
        ("complemento",    "VARCHAR(100) DEFAULT ''"),
        ("bairro",         "VARCHAR(100) DEFAULT ''"),
        ("cidade",         "VARCHAR(100) DEFAULT ''"),
        ("estado",         "VARCHAR(2) DEFAULT ''"),
        ("origem",         "VARCHAR(30) DEFAULT ''"),
        ("prof_pref",      "TEXT DEFAULT ''"),
        ("serv_pref",      "TEXT DEFAULT ''"),
        ("hora_pref",      "VARCHAR(50) DEFAULT ''"),
        ("esmalte_pref",   "VARCHAR(100) DEFAULT ''"),
        ("cor_pref",       "VARCHAR(100) DEFAULT ''"),
        ("tipo_unha",      "VARCHAR(50) DEFAULT ''"),
        ("obs_cabelo",     "TEXT DEFAULT ''"),
        ("foto",           "VARCHAR(300) DEFAULT ''"),
    ]
    with db.engine.connect() as conn:
        for col, definition in cols_usuarios:
            try:
                conn.execute(db.text(f"ALTER TABLE usuarios ADD COLUMN {col} {definition}"))
                conn.commit()
                print(f"✅ Migration usuarios: coluna {col} adicionada.")
            except Exception:
                conn.rollback()

        for col, definition in cols_agendamentos:
            try:
                conn.execute(db.text(f"ALTER TABLE agendamentos ADD COLUMN {col} {definition}"))
                conn.commit()
                print(f"✅ Migration agendamentos: {col}")
            except Exception:
                conn.rollback()

        for col, definition in cols_servicos:
            try:
                conn.execute(db.text(f"ALTER TABLE servicos ADD COLUMN {col} {definition}"))
                conn.commit()
                print(f"✅ Migration servicos: {col}")
            except Exception:
                conn.rollback()

        for col, definition in cols_profissionais:
            try:
                conn.execute(db.text(f"ALTER TABLE profissionais ADD COLUMN {col} {definition}"))
                conn.commit()
                print(f"✅ Migration profissionais: {col}")
            except Exception:
                conn.rollback()

        # Converter comissao de INTEGER para FLOAT se necessário (PostgreSQL)
        try:
            conn.execute(db.text(
                "ALTER TABLE profissionais ALTER COLUMN comissao TYPE FLOAT USING comissao::FLOAT"
            ))
            conn.commit()
            print("✅ Migration profissionais: comissao convertida para FLOAT")
        except Exception:
            conn.rollback()

        for col, definition in cols_perfis:
            try:
                conn.execute(db.text(f"ALTER TABLE perfis_acesso ADD COLUMN {col} {definition}"))
                conn.commit()
                print(f"✅ Migration perfis_acesso: coluna {col} adicionada.")
            except Exception:
                conn.rollback()

        for col, definition in cols_clientes:
            try:
                conn.execute(db.text(f"ALTER TABLE clientes ADD COLUMN {col} {definition}"))
                conn.commit()
                print(f"✅ Migration clientes: {col}")
            except Exception:
                conn.rollback()

        # Preencher data_cadastro vazia nos usuários
        try:
            conn.execute(db.text(
                "UPDATE usuarios SET data_cadastro = :d WHERE data_cadastro IS NULL OR data_cadastro = ''"
            ), {'d': str(date.today())})
            conn.commit()
        except Exception:
            conn.rollback()


with app.app_context():
    db.create_all()   # cria tabelas se não existirem
    migrate()         # adiciona colunas novas em tabelas existentes
    seed()            # insere dados de exemplo


# ── Helper ────────────────────────────────────────────────
def today():
    return str(date.today())


# ── Serve frontend ────────────────────────────────────────
@app.route('/')
def root():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/pdv.html')
def serve_pdv():
    return send_from_directory(BASE_DIR, 'pdv.html')

@app.route('/login.html')
def login_page():
    return send_from_directory(BASE_DIR, 'login.html')

@app.route('/index.html')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory(os.path.join(BASE_DIR, 'static'), path)

@app.route('/uploads/<path:path>')
def serve_uploads(path):
    """Serve arquivos do volume de uploads (Railway) ou static/uploads local."""
    return send_from_directory(UPLOAD_DIR, path)


# ═══════════════════════════════════════════════════════
# API — AUTENTICAÇÃO
# ═══════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════
# PERFIS DE ACESSO
# ═══════════════════════════════════════════════════════

@app.route('/api/perfis', methods=['GET'])
def get_perfis():
    perfis = PerfilAcesso.query.order_by(PerfilAcesso.id).all()
    result = []
    for p in perfis:
        d = p.to_dict()
        # Contar usuários com esse perfil (pelo nome do perfil em lowercase)
        nome_lower = p.nome.lower().replace(' ', '_').replace('/', '_')
        d['total_usuarios'] = Usuario.query.filter(
            db.func.lower(Usuario.role) == p.nome.lower()
        ).count()
        result.append(d)
    return jsonify(result)

@app.route('/api/perfis', methods=['POST'])
def create_perfil():
    import json
    body = request.get_json()
    if not body.get('nome'):
        return jsonify({'erro': 'Nome obrigatório'}), 400
    p = PerfilAcesso(
        nome=body['nome'],
        descricao=body.get('descricao', ''),
        padrao=body.get('padrao', False),
        ativo=body.get('ativo', True),
        permissoes=json.dumps(body.get('permissoes', {})),
        data_criacao=str(date.today()),
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201

@app.route('/api/perfis/<int:id>', methods=['PUT'])
def update_perfil(id):
    import json
    p = PerfilAcesso.query.get_or_404(id)
    body = request.get_json()
    if 'nome'       in body: p.nome       = body['nome']
    if 'descricao'  in body: p.descricao  = body['descricao']
    if 'ativo'      in body: p.ativo      = body['ativo']
    if 'padrao'     in body: p.padrao     = body['padrao']
    if 'permissoes' in body: p.permissoes = json.dumps(body['permissoes'])
    db.session.commit()
    return jsonify(p.to_dict())

@app.route('/api/perfis/<int:id>', methods=['DELETE'])
def delete_perfil(id):
    p = PerfilAcesso.query.get_or_404(id)
    if p.padrao:
        return jsonify({'erro': 'Não é possível excluir o perfil padrão'}), 400
    db.session.delete(p)
    db.session.commit()
    return jsonify({'ok': True})


# ═══════════════════════════════════════════════════════
# FORMAS DE PAGAMENTO
# ═══════════════════════════════════════════════════════

@app.route('/api/formas-pagamento', methods=['GET'])
def get_formas_pagamento():
    fps = FormaPagamento.query.order_by(FormaPagamento.id).all()
    return jsonify([fp.to_dict() for fp in fps])

@app.route('/api/formas-pagamento', methods=['POST'])
def create_forma_pagamento():
    body = request.get_json()
    if not body.get('nome'):
        return jsonify({'erro': 'Nome obrigatório'}), 400
    fp = FormaPagamento(
        nome=body['nome'], tipo=body.get('tipo','outros'),
        taxa=float(body.get('taxa', 0)),
        parcelamento=body.get('parcelamento', False),
        max_parcelas=int(body.get('max_parcelas', 1)),
        conta_destino=body.get('conta_destino', ''),
        ativo=body.get('ativo', True),
        data_cadastro=str(date.today()),
    )
    db.session.add(fp)
    db.session.commit()
    return jsonify(fp.to_dict()), 201

@app.route('/api/formas-pagamento/<int:id>', methods=['PUT'])
def update_forma_pagamento(id):
    fp = FormaPagamento.query.get_or_404(id)
    body = request.get_json()
    if 'nome'          in body: fp.nome          = body['nome']
    if 'tipo'          in body: fp.tipo          = body['tipo']
    if 'taxa'          in body: fp.taxa          = float(body['taxa'])
    if 'parcelamento'  in body: fp.parcelamento  = body['parcelamento']
    if 'max_parcelas'  in body: fp.max_parcelas  = int(body['max_parcelas'])
    if 'conta_destino' in body: fp.conta_destino = body['conta_destino']
    if 'ativo'         in body: fp.ativo         = body['ativo']
    db.session.commit()
    return jsonify(fp.to_dict())

@app.route('/api/formas-pagamento/<int:id>', methods=['DELETE'])
def delete_forma_pagamento(id):
    fp = FormaPagamento.query.get_or_404(id)
    db.session.delete(fp)
    db.session.commit()
    return jsonify({'ok': True})

@app.route('/api/login', methods=['POST'])
def login():
    body = request.get_json()
    usuario = body.get('usuario', '').strip()
    senha   = body.get('senha', '').encode()
    u = Usuario.query.filter_by(usuario=usuario, ativo=True).first()
    if not u or not bcrypt.checkpw(senha, u.senha.encode()):
        return jsonify({'erro': 'Usuário ou senha incorretos'}), 401
    token = secrets.token_hex(32)
    return jsonify({
        'ok': True,
        'token': token,
        'usuario': u.to_dict(),
        'trocar_senha': bool(u.senha_padrao),  # True = exigir troca
    })


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
    perms = body.get('permissoes', [])
    u = Usuario(
        nome=body.get('nome', body['usuario']),
        usuario=body['usuario'],
        senha=senha_hash,
        email=body.get('email', ''),
        telefone=body.get('telefone', ''),
        role=body.get('role', 'profissional'),
        ativo=body.get('ativo', True),
        permissoes=','.join(perms) if perms else 'dashboard,agenda,clientes,servicos,profissionais,atendimentos,pdv,estoque,financeiro,relatorios,configuracoes',
        data_cadastro=str(date.today()),
    )
    db.session.add(u)
    db.session.commit()
    return jsonify(u.to_dict()), 201


@app.route('/api/usuarios/<int:id>', methods=['PUT'])
def update_usuario(id):
    u = Usuario.query.get_or_404(id)
    body = request.get_json()
    if 'nome'    in body: u.nome    = body['nome']
    if 'usuario' in body:
        existing = Usuario.query.filter_by(usuario=body['usuario']).first()
        if existing and existing.id != id:
            return jsonify({'erro': 'Nome de usuário já existe'}), 409
        u.usuario = body['usuario']
    if 'role'      in body: u.role      = body['role']
    if 'ativo'     in body: u.ativo     = body['ativo']
    if 'email'     in body: u.email     = body['email']
    if 'telefone'  in body: u.telefone  = body['telefone']
    if 'permissoes' in body:
        perms = body['permissoes']
        u.permissoes = ','.join(perms) if isinstance(perms, list) else perms
    if 'foto' in body: u.foto = body['foto']
    db.session.commit()
    return jsonify(u.to_dict())


@app.route('/api/profissionais/<int:id>/foto', methods=['POST'])
def upload_foto_profissional(id):
    p = Profissional.query.get_or_404(id)
    if 'foto' not in request.files:
        return jsonify({'erro': 'Nenhum arquivo enviado'}), 400
    file = request.files['foto']
    if file.filename == '':
        return jsonify({'erro': 'Arquivo inválido'}), 400
    allowed = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in allowed:
        return jsonify({'erro': 'Formato não suportado. Use JPG, PNG, GIF ou WEBP'}), 400
    upload_dir = os.path.join(UPLOAD_DIR, 'profissionais')
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"profissional_{id}.{ext}"
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)
    p.foto = f"/uploads/profissionais/{filename}"
    db.session.commit()
    return jsonify({'ok': True, 'foto': p.foto})


@app.route('/api/usuarios/<int:id>/foto', methods=['POST'])
def upload_foto_usuario(id):
    u = Usuario.query.get_or_404(id)
    if 'foto' not in request.files:
        return jsonify({'erro': 'Nenhum arquivo enviado'}), 400
    file = request.files['foto']
    if file.filename == '':
        return jsonify({'erro': 'Arquivo inválido'}), 400
    # Validar extensão
    allowed = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in allowed:
        return jsonify({'erro': 'Formato não suportado. Use JPG, PNG, GIF ou WEBP'}), 400
    # Salvar no UPLOAD_DIR (volume Railway ou static/uploads local)
    upload_dir = os.path.join(UPLOAD_DIR, 'usuarios')
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"usuario_{id}.{ext}"
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)
    # URL para servir a foto
    u.foto = f"/uploads/usuarios/{filename}"
    db.session.commit()
    return jsonify({'ok': True, 'foto': u.foto})


@app.route('/api/usuarios/<int:id>', methods=['DELETE'])
def delete_usuario(id):
    u = Usuario.query.get_or_404(id)
    u.ativo = False  # soft delete
    db.session.commit()
    return jsonify({'ok': True})


@app.route('/api/usuarios/<int:id>/senha', methods=['PATCH'])
def change_senha(id):
    u = Usuario.query.get_or_404(id)
    body = request.get_json()
    nova = body.get('senha', '')
    if len(nova) < 8:
        return jsonify({'erro': 'Senha muito curta (mínimo 8 caracteres)'}), 400
    u.senha = bcrypt.hashpw(nova.encode(), bcrypt.gensalt()).decode()
    u.senha_padrao = False  # remove flag de troca obrigatória
    db.session.commit()
    token = secrets.token_hex(32)
    return jsonify({'ok': True, 'token': token, 'usuario': u.to_dict()})


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
        nome_social=body.get('nomeSocial', ''),
        telefone=body.get('telefone', ''),
        telefone_fixo=body.get('telefoneFixo', ''),
        email=body.get('email', ''),
        sexo=body.get('sexo', ''),
        data_nascimento=body.get('dataNascimento', ''),
        observacoes=body.get('observacoes', ''),
        obs_interna=body.get('obsInterna', ''),
        cep=body.get('cep', ''),
        rua=body.get('rua', ''),
        numero=body.get('numero', ''),
        complemento=body.get('complemento', ''),
        bairro=body.get('bairro', ''),
        cidade=body.get('cidade', ''),
        estado=body.get('estado', ''),
        origem=body.get('origem', ''),
        prof_pref=json.dumps(body.get('profPref', [])) if isinstance(body.get('profPref'), list) else str(body.get('profPref', '') or ''),
        serv_pref=body.get('servPref', ''),
        hora_pref=body.get('horaPref', ''),
        esmalte_pref=body.get('esmalte', ''),
        cor_pref=body.get('cor', ''),
        tipo_unha=body.get('tipoUnha', ''),
        obs_cabelo=body.get('obsCabelo', ''),
    )
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201


@app.route('/api/clientes/<int:id>', methods=['PUT'])
def update_cliente(id):
    c = Cliente.query.get_or_404(id)
    body = request.get_json()
    campo_map = {
        'nomeSocial': 'nome_social', 'telefoneFixo': 'telefone_fixo',
        'dataNascimento': 'data_nascimento', 'dataCadastro': 'data_cadastro',
        'ultimaVisita': 'ultima_visita', 'totalGasto': 'total_gasto',
        'obsInterna': 'obs_interna', 'profPref': 'prof_pref',
        'servPref': 'serv_pref', 'horaPref': 'hora_pref',
        'esmalte': 'esmalte_pref', 'cor': 'cor_pref',
        'tipoUnha': 'tipo_unha', 'obsCabelo': 'obs_cabelo',
    }
    # Campos que devem ser sempre salvos como string (JSON ou texto)
    campos_texto = {'prof_pref', 'serv_pref', 'hora_pref'}
    for k, v in body.items():
        campo = campo_map.get(k, k)
        if hasattr(c, campo) and campo != 'id':
            # Garante que campos JSON sejam salvos como string
            if campo in campos_texto:
                if isinstance(v, list):
                    import json
                    v = json.dumps(v)
                else:
                    v = str(v) if v else ''
            setattr(c, campo, v)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        # Se falhar por tipo de coluna, tenta migration e re-salva
        try:
            with db.engine.connect() as conn:
                conn.execute(db.text("ALTER TABLE clientes ADD COLUMN prof_pref_new TEXT DEFAULT ''"))
                conn.execute(db.text("UPDATE clientes SET prof_pref_new = CAST(prof_pref AS TEXT)"))
                conn.execute(db.text("ALTER TABLE clientes DROP COLUMN prof_pref"))
                conn.execute(db.text("ALTER TABLE clientes RENAME COLUMN prof_pref_new TO prof_pref"))
                conn.commit()
            # Re-tenta salvar sem o prof_pref problemático
            c2 = Cliente.query.get_or_404(id)
            for k, v in body.items():
                campo = campo_map.get(k, k)
                if hasattr(c2, campo) and campo != 'id':
                    if campo in campos_texto:
                        if isinstance(v, list):
                            import json
                            v = json.dumps(v)
                        else:
                            v = str(v) if v else ''
                    setattr(c2, campo, v)
            db.session.commit()
            return jsonify(c2.to_dict())
        except Exception as e2:
            db.session.rollback()
            return jsonify({'erro': str(e2)}), 500
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
        nome            = body.get('nome', ''),
        nome_social     = body.get('nome_social', ''),
        funcao          = body.get('funcao', ''),
        telefone        = body.get('telefone', ''),
        telefone_fixo   = body.get('telefone_fixo', ''),
        email           = body.get('email', ''),
        sexo            = body.get('sexo', ''),
        data_nascimento = body.get('data_nascimento', ''),
        cpf             = body.get('cpf', ''),
        rg              = body.get('rg', ''),
        orgao_emissor   = body.get('orgao_emissor', ''),
        data_emissao    = body.get('data_emissao', ''),
        cep             = body.get('cep', ''),
        rua             = body.get('rua', ''),
        numero          = body.get('numero', ''),
        complemento     = body.get('complemento', ''),
        bairro          = body.get('bairro', ''),
        cidade          = body.get('cidade', ''),
        estado          = body.get('estado', ''),
        origem          = body.get('origem', ''),
        obs             = body.get('obs', ''),
        comissao        = int(body.get('comissao', 0)),
        tipo_comissao   = body.get('tipo_comissao', 'percentual'),
        ativo           = body.get('ativo', True),
        status          = 'ativo' if body.get('ativo', True) else 'inativo',
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@app.route('/api/profissionais/<int:id>', methods=['PUT'])
def update_profissional(id):
    p = Profissional.query.get_or_404(id)
    body = request.get_json()

    # Campos string — atribuição direta
    str_fields = [
        'nome', 'nome_social', 'funcao', 'telefone', 'telefone_fixo',
        'email', 'sexo', 'data_nascimento', 'cpf', 'rg', 'orgao_emissor',
        'data_emissao', 'cep', 'rua', 'numero', 'complemento', 'bairro',
        'cidade', 'estado', 'origem', 'obs', 'foto', 'tipo_comissao', 'status',
    ]
    for f in str_fields:
        if f in body:
            setattr(p, f, str(body[f]) if body[f] is not None else '')

    # Campos numéricos
    if 'comissao' in body:
        try:
            p.comissao = int(float(body['comissao']))
        except (ValueError, TypeError):
            pass
    if 'atendimentosMes' in body:
        p.atendimentos_mes = int(body['atendimentosMes'] or 0)
    if 'faturamentoMes' in body:
        p.faturamento_mes = float(body['faturamentoMes'] or 0)

    # Booleano ativo — sincroniza status
    if 'ativo' in body:
        p.ativo   = bool(body['ativo'])
        p.status  = 'ativo' if body['ativo'] else 'inativo'
    elif 'status' in body:
        p.status  = body['status']
        p.ativo   = (body['status'] == 'ativo')

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
    import json
    body = request.get_json()
    s = Servico(
        nome          = body.get('nome', ''),
        categoria     = body.get('categoria', 'Outros'),
        descricao     = body.get('descricao', ''),
        preco         = float(body.get('preco', 0)),
        duracao       = int(body.get('duracao', 60)),
        comissao      = float(body.get('comissao', 20)),
        tipo_comissao = body.get('tipo_comissao', 'percentual'),
        emoji         = body.get('emoji', '✨'),
        obs           = body.get('obs', ''),
        ativo         = body.get('ativo', True),
        profissionais_ids = json.dumps(body.get('profissionais_ids', [])),
        produtos_json     = json.dumps(body.get('produtos_utilizados', [])),
    )
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@app.route('/api/servicos/<int:id>', methods=['PUT'])
def update_servico(id):
    import json
    s = Servico.query.get_or_404(id)
    body = request.get_json()
    str_fields = ['nome','categoria','descricao','emoji','obs','tipo_comissao']
    for f in str_fields:
        if f in body:
            setattr(s, f, str(body[f]) if body[f] is not None else '')
    if 'preco'    in body: s.preco    = float(body['preco'] or 0)
    if 'duracao'  in body: s.duracao  = int(body['duracao'] or 60)
    if 'comissao' in body: s.comissao = float(body['comissao'] or 0)
    if 'ativo'    in body: s.ativo    = bool(body['ativo'])
    if 'profissionais_ids'   in body: s.profissionais_ids = json.dumps(body['profissionais_ids'])
    if 'produtos_utilizados' in body: s.produtos_json     = json.dumps(body['produtos_utilizados'])
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500
    return jsonify(s.to_dict())


@app.route('/api/servicos/<int:id>/foto', methods=['POST'])
def upload_foto_servico(id):
    s = Servico.query.get_or_404(id)
    if 'foto' not in request.files:
        return jsonify({'erro': 'Nenhum arquivo enviado'}), 400
    file = request.files['foto']
    if file.filename == '':
        return jsonify({'erro': 'Arquivo inválido'}), 400
    allowed = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in allowed:
        return jsonify({'erro': 'Formato não suportado'}), 400
    upload_dir = os.path.join(UPLOAD_DIR, 'servicos')
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"servico_{id}.{ext}"
    file.save(os.path.join(upload_dir, filename))
    s.foto = f"/uploads/servicos/{filename}"
    db.session.commit()
    return jsonify({'ok': True, 'foto': s.foto})


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
        hora_fim=body.get('hora_fim', ''),
        duracao=body.get('duracao', serv.duracao if serv else 60),
        valor=body.get('valor', serv.preco if serv else 0),
        status=body.get('status', 'confirmado'),
        obs=body.get('obs', ''),
        forma_pgto=body.get('formaPgto', ''),
        tipo_atendimento=body.get('tipoAtendimento', 'presencial'),
        desconto=body.get('desconto', 0),
    )
    db.session.add(a)
    db.session.commit()
    return jsonify(_enrich(a)), 201



@app.route('/api/agendamentos/<int:id>', methods=['PUT'])
def update_agendamento(id):
    a    = Agendamento.query.get_or_404(id)
    body = request.get_json()
    if 'clienteId'  in body: a.cliente_id  = body['clienteId']
    if 'proId'      in body: a.pro_id      = body['proId']
    if 'servicoId'  in body: a.servico_id  = body['servicoId']
    if 'data'       in body: a.data        = body['data']
    if 'hora'       in body: a.hora        = body['hora']
    if 'hora_fim'   in body: a.hora_fim    = body['hora_fim']
    if 'duracao'    in body: a.duracao     = body['duracao']
    if 'valor'      in body: a.valor       = body['valor']
    if 'status'     in body: a.status      = body['status']
    if 'obs'             in body: a.obs              = body['obs']
    if 'tipoAtendimento' in body: a.tipo_atendimento = body['tipoAtendimento']
    if 'desconto'        in body: a.desconto         = body['desconto']
    db.session.commit()
    return jsonify(_enrich(a))

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

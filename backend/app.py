"""
BELEZZA — Backend Flask API
Sistema de Gestão de Salão de Beleza
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime, date

# ── Configuração ─────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, 'static'),
    template_folder=BASE_DIR
)
CORS(app)

# ── Banco de dados em memória (substitua por SQLite/PostgreSQL) ──
# Em produção, use db.py com SQLAlchemy ou similar.
DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')


def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return _default_data()


def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _default_data():
    return {
        "clientes": [
            {"id": 1, "nome": "Ana Paula Ferreira", "telefone": "(11) 99234-5678",
             "email": "ana@email.com", "dataCadastro": "2024-01-10",
             "ultimaVisita": "2025-08-28", "totalGasto": 1840, "visitas": 14,
             "observacoes": "Alergia a acetona"},
            {"id": 2, "nome": "Beatriz Santos", "telefone": "(11) 98765-4321",
             "email": "bea@email.com", "dataCadastro": "2024-03-15",
             "ultimaVisita": "2025-08-30", "totalGasto": 3200, "visitas": 28,
             "observacoes": "Prefere horário manhã"},
        ],
        "profissionais": [
            {"id": 1, "nome": "Camila Rocha", "funcao": "Manicure & Pedicure",
             "telefone": "(11) 91234-5678", "comissao": 45,
             "atendimentosMes": 62, "faturamentoMes": 5580, "status": "ativo"},
            {"id": 2, "nome": "Larissa Dias", "funcao": "Cabeleireira",
             "telefone": "(11) 90987-6543", "comissao": 40,
             "atendimentosMes": 38, "faturamentoMes": 8320, "status": "ativo"},
        ],
        "servicos": [
            {"id": 1, "nome": "Manicure simples", "categoria": "Unhas",
             "preco": 40, "duracao": 45, "comissao": 45, "emoji": "💅", "ativo": True},
            {"id": 2, "nome": "Pedicure simples", "categoria": "Unhas",
             "preco": 50, "duracao": 60, "comissao": 45, "emoji": "🦶", "ativo": True},
            {"id": 3, "nome": "Corte feminino", "categoria": "Cabelo",
             "preco": 80, "duracao": 60, "comissao": 40, "emoji": "✂️", "ativo": True},
        ],
        "produtos": [
            {"id": 1, "nome": "Base coat Essie", "categoria": "Unhas",
             "qtd": 3, "minimo": 5, "unidade": "un", "custo": 18, "preco": 45},
            {"id": 2, "nome": "Acetona 1L", "categoria": "Unhas",
             "qtd": 2, "minimo": 4, "unidade": "un", "custo": 12, "preco": 25},
        ],
        "agendamentos": [
            {"id": 1, "clienteId": 1, "proId": 1, "servicoId": 1,
             "data": str(date.today()), "hora": "09:00", "duracao": 45,
             "status": "confirmado", "valor": 40, "obs": ""},
        ],
        "transacoes": [],
    }


# ── Helpers ──────────────────────────────────────────────
def next_id(lst):
    return max((x['id'] for x in lst), default=0) + 1


def today():
    return str(date.today())


# ── Serve frontend ────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory(os.path.join(BASE_DIR, 'static'), path)


# ═══════════════════════════════════════════════════════
# API — CLIENTES
# ═══════════════════════════════════════════════════════

@app.route('/api/clientes', methods=['GET'])
def get_clientes():
    data = load_data()
    busca = request.args.get('busca', '').lower()
    clientes = data['clientes']
    if busca:
        clientes = [c for c in clientes
                    if busca in c['nome'].lower()
                    or busca in c.get('email', '').lower()
                    or busca in c.get('telefone', '')]
    return jsonify(clientes)


@app.route('/api/clientes/<int:id>', methods=['GET'])
def get_cliente(id):
    data = load_data()
    c = next((x for x in data['clientes'] if x['id'] == id), None)
    if not c:
        return jsonify({'erro': 'Cliente não encontrado'}), 404
    # histórico
    historico = [a for a in data['agendamentos'] if a['clienteId'] == id]
    return jsonify({**c, 'historico': historico})


@app.route('/api/clientes', methods=['POST'])
def create_cliente():
    data = load_data()
    body = request.get_json()
    if not body.get('nome'):
        return jsonify({'erro': 'Nome obrigatório'}), 400
    novo = {
        'id': next_id(data['clientes']),
        'nome': body['nome'],
        'telefone': body.get('telefone', ''),
        'email': body.get('email', ''),
        'dataCadastro': today(),
        'ultimaVisita': today(),
        'totalGasto': 0,
        'visitas': 0,
        'observacoes': body.get('observacoes', ''),
    }
    data['clientes'].append(novo)
    save_data(data)
    return jsonify(novo), 201


@app.route('/api/clientes/<int:id>', methods=['PUT'])
def update_cliente(id):
    data = load_data()
    c = next((x for x in data['clientes'] if x['id'] == id), None)
    if not c:
        return jsonify({'erro': 'Não encontrado'}), 404
    body = request.get_json()
    c.update({k: v for k, v in body.items() if k != 'id'})
    save_data(data)
    return jsonify(c)


@app.route('/api/clientes/<int:id>', methods=['DELETE'])
def delete_cliente(id):
    data = load_data()
    data['clientes'] = [c for c in data['clientes'] if c['id'] != id]
    save_data(data)
    return jsonify({'ok': True})


# ═══════════════════════════════════════════════════════
# API — PROFISSIONAIS
# ═══════════════════════════════════════════════════════

@app.route('/api/profissionais', methods=['GET'])
def get_profissionais():
    data = load_data()
    return jsonify(data['profissionais'])


@app.route('/api/profissionais', methods=['POST'])
def create_profissional():
    data = load_data()
    body = request.get_json()
    if not body.get('nome'):
        return jsonify({'erro': 'Nome obrigatório'}), 400
    novo = {
        'id': next_id(data['profissionais']),
        'nome': body['nome'],
        'funcao': body.get('funcao', ''),
        'telefone': body.get('telefone', ''),
        'comissao': body.get('comissao', 40),
        'atendimentosMes': 0,
        'faturamentoMes': 0,
        'status': 'ativo',
    }
    data['profissionais'].append(novo)
    save_data(data)
    return jsonify(novo), 201


@app.route('/api/profissionais/<int:id>', methods=['PUT'])
def update_profissional(id):
    data = load_data()
    p = next((x for x in data['profissionais'] if x['id'] == id), None)
    if not p:
        return jsonify({'erro': 'Não encontrado'}), 404
    body = request.get_json()
    p.update({k: v for k, v in body.items() if k != 'id'})
    save_data(data)
    return jsonify(p)


# ═══════════════════════════════════════════════════════
# API — SERVIÇOS
# ═══════════════════════════════════════════════════════

@app.route('/api/servicos', methods=['GET'])
def get_servicos():
    data = load_data()
    apenas_ativos = request.args.get('ativo')
    servicos = data['servicos']
    if apenas_ativos == 'true':
        servicos = [s for s in servicos if s.get('ativo')]
    return jsonify(servicos)


@app.route('/api/servicos', methods=['POST'])
def create_servico():
    data = load_data()
    body = request.get_json()
    novo = {
        'id': next_id(data['servicos']),
        'nome': body.get('nome', ''),
        'categoria': body.get('categoria', 'Outros'),
        'preco': float(body.get('preco', 0)),
        'duracao': int(body.get('duracao', 60)),
        'comissao': int(body.get('comissao', 40)),
        'emoji': body.get('emoji', '✨'),
        'ativo': True,
    }
    data['servicos'].append(novo)
    save_data(data)
    return jsonify(novo), 201


@app.route('/api/servicos/<int:id>', methods=['PUT'])
def update_servico(id):
    data = load_data()
    s = next((x for x in data['servicos'] if x['id'] == id), None)
    if not s:
        return jsonify({'erro': 'Não encontrado'}), 404
    body = request.get_json()
    s.update({k: v for k, v in body.items() if k != 'id'})
    save_data(data)
    return jsonify(s)


# ═══════════════════════════════════════════════════════
# API — AGENDAMENTOS
# ═══════════════════════════════════════════════════════

@app.route('/api/agendamentos', methods=['GET'])
def get_agendamentos():
    data = load_data()
    data_filtro = request.args.get('data')
    agendamentos = data['agendamentos']
    if data_filtro:
        agendamentos = [a for a in agendamentos if a['data'] == data_filtro]
    # Enrich with names
    clientes_map = {c['id']: c for c in data['clientes']}
    pros_map     = {p['id']: p for p in data['profissionais']}
    servicos_map = {s['id']: s for s in data['servicos']}
    result = []
    for a in agendamentos:
        enrich = {
            **a,
            'clienteNome':   clientes_map.get(a['clienteId'], {}).get('nome', ''),
            'profNome':      pros_map.get(a['proId'], {}).get('nome', ''),
            'servicoNome':   servicos_map.get(a['servicoId'], {}).get('nome', ''),
        }
        result.append(enrich)
    return jsonify(sorted(result, key=lambda x: (x['data'], x['hora'])))


@app.route('/api/agendamentos/hoje', methods=['GET'])
def get_agenda_hoje():
    data = load_data()
    hoje = today()
    agendamentos = [a for a in data['agendamentos'] if a['data'] == hoje]
    return jsonify(agendamentos)


@app.route('/api/agendamentos', methods=['POST'])
def create_agendamento():
    data = load_data()
    body = request.get_json()
    required = ['clienteId', 'proId', 'servicoId', 'data', 'hora']
    for field in required:
        if field not in body:
            return jsonify({'erro': f'{field} obrigatório'}), 400
    serv = next((s for s in data['servicos'] if s['id'] == body['servicoId']), None)
    novo = {
        'id': next_id(data['agendamentos']),
        'clienteId': body['clienteId'],
        'proId': body['proId'],
        'servicoId': body['servicoId'],
        'data': body['data'],
        'hora': body['hora'],
        'duracao': serv['duracao'] if serv else 60,
        'status': 'confirmado',
        'valor': serv['preco'] if serv else 0,
        'obs': body.get('obs', ''),
    }
    data['agendamentos'].append(novo)
    save_data(data)
    return jsonify(novo), 201


@app.route('/api/agendamentos/<int:id>/status', methods=['PATCH'])
def update_status(id):
    data = load_data()
    a = next((x for x in data['agendamentos'] if x['id'] == id), None)
    if not a:
        return jsonify({'erro': 'Não encontrado'}), 404
    body = request.get_json()
    status = body.get('status')
    if status not in ('confirmado', 'pendente', 'finalizado', 'cancelado'):
        return jsonify({'erro': 'Status inválido'}), 400
    a['status'] = status
    # Se finalizado, atualiza cliente
    if status == 'finalizado':
        cli = next((c for c in data['clientes'] if c['id'] == a['clienteId']), None)
        if cli:
            cli['totalGasto'] += a['valor']
            cli['visitas'] += 1
            cli['ultimaVisita'] = today()
        # Lança transação automática
        data['transacoes'].append({
            'id': next_id(data['transacoes']),
            'tipo': 'entrada',
            'descricao': f"Atendimento #{id}",
            'data': today(),
            'valor': a['valor'],
            'forma': body.get('formaPgto', 'dinheiro'),
            'categoria': 'servico',
        })
    save_data(data)
    return jsonify(a)


# ═══════════════════════════════════════════════════════
# API — PRODUTOS / ESTOQUE
# ═══════════════════════════════════════════════════════

@app.route('/api/produtos', methods=['GET'])
def get_produtos():
    data = load_data()
    apenas_baixo = request.args.get('baixo') == 'true'
    produtos = data['produtos']
    if apenas_baixo:
        produtos = [p for p in produtos if p['qtd'] <= p['minimo']]
    return jsonify(produtos)


@app.route('/api/produtos', methods=['POST'])
def create_produto():
    data = load_data()
    body = request.get_json()
    novo = {
        'id': next_id(data['produtos']),
        'nome': body.get('nome', ''),
        'categoria': body.get('categoria', ''),
        'qtd': int(body.get('qtd', 0)),
        'minimo': int(body.get('minimo', 5)),
        'unidade': body.get('unidade', 'un'),
        'custo': float(body.get('custo', 0)),
        'preco': float(body.get('preco', 0)),
    }
    data['produtos'].append(novo)
    save_data(data)
    return jsonify(novo), 201


@app.route('/api/produtos/<int:id>/entrada', methods=['POST'])
def entrada_estoque(id):
    data = load_data()
    p = next((x for x in data['produtos'] if x['id'] == id), None)
    if not p:
        return jsonify({'erro': 'Produto não encontrado'}), 404
    body = request.get_json()
    qty = int(body.get('qtd', 0))
    if qty <= 0:
        return jsonify({'erro': 'Quantidade inválida'}), 400
    p['qtd'] += qty
    save_data(data)
    return jsonify({'produto': p, 'qtdAdicionada': qty})


@app.route('/api/produtos/<int:id>/saida', methods=['POST'])
def saida_estoque(id):
    data = load_data()
    p = next((x for x in data['produtos'] if x['id'] == id), None)
    if not p:
        return jsonify({'erro': 'Produto não encontrado'}), 404
    body = request.get_json()
    qty = int(body.get('qtd', 0))
    if qty <= 0 or qty > p['qtd']:
        return jsonify({'erro': 'Quantidade inválida ou insuficiente'}), 400
    p['qtd'] -= qty
    save_data(data)
    return jsonify({'produto': p, 'qtdRetirada': qty})


# ═══════════════════════════════════════════════════════
# API — FINANCEIRO
# ═══════════════════════════════════════════════════════

@app.route('/api/transacoes', methods=['GET'])
def get_transacoes():
    data = load_data()
    tipo = request.args.get('tipo')
    transacoes = data['transacoes']
    if tipo:
        transacoes = [t for t in transacoes if t['tipo'] == tipo]
    return jsonify(sorted(transacoes, key=lambda x: x['data'], reverse=True))


@app.route('/api/transacoes', methods=['POST'])
def create_transacao():
    data = load_data()
    body = request.get_json()
    nova = {
        'id': next_id(data['transacoes']),
        'tipo': body.get('tipo', 'entrada'),
        'descricao': body.get('descricao', ''),
        'data': body.get('data', today()),
        'valor': float(body.get('valor', 0)),
        'forma': body.get('forma', 'dinheiro'),
        'categoria': body.get('categoria', 'outros'),
    }
    data['transacoes'].append(nova)
    save_data(data)
    return jsonify(nova), 201


# ═══════════════════════════════════════════════════════
# API — RESUMO / DASHBOARD
# ═══════════════════════════════════════════════════════

@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    data = load_data()
    hoje = today()

    # Atendimentos hoje
    agenda_hoje = [a for a in data['agendamentos'] if a['data'] == hoje]
    confirmados = [a for a in agenda_hoje if a['status'] == 'confirmado']

    # Faturamento hoje
    fat_hoje = sum(a['valor'] for a in confirmados)

    # Faturamento mês
    mes = hoje[:7]  # YYYY-MM
    fat_mes = sum(
        t['valor'] for t in data['transacoes']
        if t['tipo'] == 'entrada' and t['data'].startswith(mes)
    )

    # Estoque baixo
    estoque_baixo = [p for p in data['produtos'] if p['qtd'] <= p['minimo']]

    return jsonify({
        'atendimentosHoje': len(agenda_hoje),
        'confirmadosHoje': len(confirmados),
        'faturamentoHoje': fat_hoje,
        'faturamentoMes': fat_mes,
        'totalClientes': len(data['clientes']),
        'estoqueBaixo': len(estoque_baixo),
        'agendaHoje': agenda_hoje[:6],
        'produtosBaixos': estoque_baixo,
    })


# ═══════════════════════════════════════════════════════
# API — RELATÓRIOS
# ═══════════════════════════════════════════════════════

@app.route('/api/relatorios/faturamento', methods=['GET'])
def relatorio_faturamento():
    data = load_data()
    mes = request.args.get('mes', today()[:7])
    entradas = [t for t in data['transacoes']
                if t['tipo'] == 'entrada' and t['data'].startswith(mes)]
    saidas = [t for t in data['transacoes']
              if t['tipo'] == 'saida' and t['data'].startswith(mes)]
    return jsonify({
        'mes': mes,
        'totalEntradas': sum(t['valor'] for t in entradas),
        'totalSaidas': sum(t['valor'] for t in saidas),
        'saldo': sum(t['valor'] for t in entradas) - sum(t['valor'] for t in saidas),
        'qtdTransacoes': len(entradas) + len(saidas),
    })


@app.route('/api/relatorios/comissoes', methods=['GET'])
def relatorio_comissoes():
    data = load_data()
    comissoes = []
    for p in data['profissionais']:
        comissoes.append({
            'profissional': p['nome'],
            'atendimentos': p['atendimentosMes'],
            'faturamento': p['faturamentoMes'],
            'comissaoPct': p['comissao'],
            'valorComissao': p['faturamentoMes'] * p['comissao'] / 100,
        })
    return jsonify(sorted(comissoes, key=lambda x: x['valorComissao'], reverse=True))


# ═══════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════

if __name__ == '__main__':
    print("🌸 Belezza — Sistema de Gestão iniciando...")
    print(f"   Frontend: http://localhost:5000")
    print(f"   API:      http://localhost:5000/api")
    app.run(debug=True, port=5000, host='0.0.0.0')

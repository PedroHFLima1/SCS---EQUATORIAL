import pandas as pd
from supabase import create_client, Client
import os
from datetime import datetime
import uuid

# Inicializar o cliente Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def process_csv_import(file_path: str):
    """
    Realiza o parse do CSV via Pandas e aciona o Upsert/Update no Supabase em lote.
    A lógica de cascata do 'statusInscricao' é resolvida pela Trigger no banco.
    """
    try:
        # 1. Lê o arquivo CSV
        df = pd.read_csv(file_path)
        
        # Opcional: Normalizar nomes das colunas
        df.columns = df.columns.str.strip().str.lower()
        
        # Ajuste nas colunas para pegar inscricao independente de acento
        insc_col = None
        if 'inscrição' in df.columns:
            insc_col = 'inscrição'
        elif 'inscricao' in df.columns:
            insc_col = 'inscricao'
            
        if not insc_col or not {'projeto', 'modulo', 'novo status'}.issubset(df.columns):
            raise ValueError("O CSV não contém as colunas necessárias: (Inscrição, Projeto, Modulo, Novo Status).")
            
        updates = []
        logs = []
        
        for index, row in df.iterrows():
            inscricao = str(row[insc_col]).strip()
            projeto_id = str(row['projeto']).strip()
            modulo = str(row['modulo']).strip().lower()
            novo_status = str(row['novo status']).strip()
            
            # Montar ID composto exigido: [Inscricao]_[Projeto]_[Modulo]
            update_id = f"{inscricao}_{projeto_id}_{modulo}"

            data_to_update = {}
            if 'ambiental' in modulo:
                data_to_update['statusAmbiental'] = novo_status
            elif 'travessia' in modulo:
                data_to_update['statusTravessia'] = novo_status
            elif 'anuência' in modulo or 'anuencia' in modulo:
                data_to_update['statusAnuencia'] = novo_status
            else:
                continue # Pula se não identificar o módulo
            
            # Não calculamos statusInscricao aqui! O banco fará isso via Trigger `BEFORE UPDATE`.
            updates.append({
                'id': update_id,
                'inscricao': inscricao,
                'projeto': projeto_id,
                **data_to_update
            })
            
            # 3. Preparar o log para a tabela de histórico (Movement)
            logs.append({
                'id': str(uuid.uuid4()),
                'processId': update_id,
                'description': f"Status alterado de forma massiva via importação de planilha para: {novo_status}",
                'module': modulo,
                'user': 'Sistema (Importação)',
                'date': datetime.utcnow().isoformat(),
                'type': 'status_massivo'
            })
            
        if updates:
            # 2. Executar um upsert massivo via API do Supabase usando 'id' no on_conflict
            response = supabase.table('Process').upsert(
                updates, 
                on_conflict='id'
            ).execute()
            
            # Inserção do histórico
            if logs:
                supabase.table('Movement').insert(logs).execute()
            
            print(f"✅ Importação de {len(updates)} registros enviada com sucesso!")
            
    except Exception as e:
        print(f"❌ Erro durante a importação: {e}")

if __name__ == "__main__":
    process_csv_import("caminho_para_seu_arquivo.csv")

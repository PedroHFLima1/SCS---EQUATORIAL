-- ==========================================
-- 1. Criação da Função da Trigger
-- ==========================================
CREATE OR REPLACE FUNCTION update_status_inscricao_cascade()
RETURNS TRIGGER AS $$
DECLARE
    -- Variáveis auxiliares
    anuencia TEXT;
    travessia TEXT;
    ambiental TEXT;
    is_em_andamento BOOLEAN := FALSE;
    is_aprovado BOOLEAN := TRUE;
    modulos_ativos INT := 0;
    
    -- Status que caracterizam "Em Andamento/Rejeição" (Prioridade 1)
    andamento_anuencia TEXT[] := ARRAY['NEGADO', 'DUP'];
    andamento_travessia TEXT[] := ARRAY['PROTOCOLADO', 'EM ANDAMENTO CONCESSIONÁRIA', 'PROTOCOLADO - CORREÇÃO', 'TAXA'];
    andamento_ambiental TEXT[] := ARRAY['EM ESTUDO', 'PROCESSO SEMAD', 'PROTOCOLADO'];
BEGIN
    -- Captura os valores (tratando nulo como inexistente)
    anuencia := COALESCE(NEW."statusAnuencia", '');
    travessia := COALESCE(NEW."statusTravessia", '');
    ambiental := COALESCE(NEW."statusAmbiental", '');

    -- ISOLAMENTO: Apenas atualizamos a inscrição específica do módulo se ele tiver sofrido alteração
    IF OLD."statusAnuencia" IS DISTINCT FROM NEW."statusAnuencia" AND anuencia != '' THEN
        IF anuencia = ANY(andamento_anuencia) THEN
            NEW."statusInscricaoAnuencia" := 'EM ANDAMENTO';
        ELSIF anuencia = 'ATENDIDO' THEN
            NEW."statusInscricaoAnuencia" := 'APROVADO';
        END IF;
    END IF;

    IF OLD."statusTravessia" IS DISTINCT FROM NEW."statusTravessia" AND travessia != '' THEN
        IF travessia = ANY(andamento_travessia) THEN
            NEW."statusInscricaoTravessia" := 'EM ANDAMENTO';
        ELSIF travessia = 'APROVADO' THEN
            NEW."statusInscricaoTravessia" := 'APROVADO';
        END IF;
    END IF;

    IF OLD."statusAmbiental" IS DISTINCT FROM NEW."statusAmbiental" AND ambiental != '' THEN
        IF ambiental = ANY(andamento_ambiental) THEN
            NEW."statusInscricaoAmbiental" := 'EM ANDAMENTO';
        ELSIF ambiental = 'APROVADO' THEN
            NEW."statusInscricaoAmbiental" := 'APROVADO';
        END IF;
    END IF;

    -- Avaliação Global (statusInscricao geral do Projeto)
    IF anuencia != '' THEN
        modulos_ativos := modulos_ativos + 1;
        IF anuencia = ANY(andamento_anuencia) THEN
            is_em_andamento := TRUE;
        END IF;
        IF anuencia != 'ATENDIDO' THEN
            is_aprovado := FALSE;
        END IF;
    END IF;

    IF travessia != '' THEN
        modulos_ativos := modulos_ativos + 1;
        IF travessia = ANY(andamento_travessia) THEN
            is_em_andamento := TRUE;
        END IF;
        IF travessia != 'APROVADO' THEN
            is_aprovado := FALSE;
        END IF;
    END IF;

    IF ambiental != '' THEN
        modulos_ativos := modulos_ativos + 1;
        IF ambiental = ANY(andamento_ambiental) THEN
            is_em_andamento := TRUE;
        END IF;
        IF ambiental != 'APROVADO' THEN
            is_aprovado := FALSE;
        END IF;
    END IF;

    IF is_em_andamento THEN
        NEW."statusInscricao" := 'EM ANDAMENTO';
    ELSIF modulos_ativos > 0 AND is_aprovado THEN
        NEW."statusInscricao" := 'APROVADO';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 2. Associação da Trigger à Tabela
-- ==========================================
DROP TRIGGER IF EXISTS trg_update_status_inscricao ON "Process";

CREATE TRIGGER trg_update_status_inscricao
BEFORE UPDATE OF "statusAnuencia", "statusTravessia", "statusAmbiental"
ON "Process"
FOR EACH ROW
WHEN (OLD."statusAnuencia" IS DISTINCT FROM NEW."statusAnuencia"
   OR OLD."statusTravessia" IS DISTINCT FROM NEW."statusTravessia"
   OR OLD."statusAmbiental" IS DISTINCT FROM NEW."statusAmbiental")
EXECUTE FUNCTION update_status_inscricao_cascade();

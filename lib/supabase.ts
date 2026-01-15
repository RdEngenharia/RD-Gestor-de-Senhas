import { createClient } from '@supabase/supabase-js';

/**
 * Configuração do Cliente Supabase para RD Gestor de Senhas
 * Estas chaves permitem a comunicação com o backend de backup.
 */
const supabaseUrl = 'https://vvaejvmcprnncfctjsjc.supabase.co';
const supabaseKey = 'sb_publishable_Lze6GHYj6Wc4jVXu1l4cIQ_2vj97qdk'; 

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * ESQUEMA SQL NECESSÁRIO NO SUPABASE:
 * 
 * CREATE TABLE IF NOT EXISTS backups (
 *   user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *   encrypted_blob TEXT NOT NULL, -- Contém itens + metadados criptografados
 *   salt TEXT NOT NULL,           -- Identificador de versão ou salt global
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
 * 
 * CREATE POLICY "Individual backup access" 
 * ON backups FOR ALL 
 * USING (auth.uid() = user_id);
 */
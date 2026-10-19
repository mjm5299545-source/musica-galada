# CONTINUIDADE_CODEX — Galada

Atualizado em 19/10/2026. Documento para o Codex continuar sem recomeçar.
Repositório: https://github.com/mjm5299545-source/musica-galada (branch `main`, 1 commit base: `57e2ada`).

> **Importante:** as alterações abaixo foram feitas numa cópia local do Claude e **NÃO foram enviadas ao GitHub** (sem credenciais de escrita). Estão em `galada-catalogo.patch`. Aplicar: `git apply galada-catalogo.patch`.

## 1. Diagnóstico (verificado por execução)
Stack: React 19 + TypeScript + Vite 7, sem backend. Dados em `src/data/catalog.ts` (6 faixas sintéticas "Galada Lab"), player em `src/hooks/useAudioPlayer.ts`, favoritos/playlists em `localStorage` (`useLibrary.ts`), importação de áudio local sem persistência dos bytes. Busca no `App.tsx` (título/artista/álbum/gênero, sem acentos).

Estado inicial: `npm ci`, `npm run build` e `npm test` (17 testes) passaram. Não encontrei erros de compilação ou de testes.

Problemas prioritários encontrados:
1. Catálogo fixo no código: não dava para adicionar músicas próprias sem editar TypeScript. **(tratado nesta etapa)**
2. `App.tsx` tem ~60 KB num só arquivo e a home usava `demoTracks` direto em vez de uma fonte única. **(home agora usa `shelfTracks`; o split do arquivo ficou pendente)**
3. Faixas importadas do dispositivo somem ao recarregar (só a referência é lembrada). Sem backend/IndexedDB.
4. Sem login, backend ou sincronização: favoritos/playlists são por navegador.
5. Sem lint configurado; testes e2e não foram reexecutados por mim (ver §4).

## 2. O que foi feito
- `public/catalog.json` (novo): catálogo editável do usuário. Começa vazio.
- `src/data/catalogLoader.ts` (novo): `fetchCatalog` + `parseCatalog`. Valida título, artista, `src` (só `/caminho` ou `https://`; bloqueia `javascript:`, `data:`, `http:`, `//`), exige campo `rights` (declaração de direitos), gera id `catalog-<slug>`, descarta duplicados e devolve a lista de itens ignorados com o motivo. 404 = catálogo vazio.
- `src/hooks/useCatalog.ts` (novo): estados `loading | ready | error`.
- `src/types.ts`: `Track.source` agora aceita `"catalog"`.
- `src/App.tsx`: `tracks = demo + catálogo + locais`; busca, home, "Surpreenda-me" e playlists enxergam as faixas do catálogo; rótulos de origem; aviso (`role="status"`) se o JSON falhar ou itens forem ignorados. Layout e CSS **não** foram alterados.
- `src/data/catalogLoader.test.ts` (novo): 5 testes.

Como adicionar uma música: copie o MP3 para `public/media/`, a capa (opcional) para `public/artwork/` e edite `public/catalog.json`:
```json
{ "tracks": [ { "title": "Nome", "artist": "Você", "album": "Opcional", "genre": "Opcional",
  "src": "/media/arquivo.mp3", "cover": "/artwork/capa.svg", "duration": 180,
  "rights": "Obra própria" } ] }
```
`duration` é opcional (0 = lida do áudio). Só use áudio de que você tenha direitos/autorização.

## 3. O que funciona / o que ainda é demo
Funciona: busca, player, fila, favoritos, playlists, importação local, catálogo JSON (validado por testes unitários).
Ainda é demo: sem backend; o catálogo é um arquivo estático versionado no Git; nada de contas, upload, pagamentos ou catálogo comercial.
Limitação nova: faixas na home aparecem só depois do fetch do JSON (sem skeleton de carregamento).

## 4. Validação realizada (por mim, Node no ambiente Linux)
- `npm ci` OK; `npm run typecheck` OK; `npm run build` OK; `npm test`: **22/22 aprovados** (17 antigos + 5 novos).
- `vite preview` serviu `/catalog.json` (HTTP 200).
**Não validado:** `npm run test:e2e` (sem Chromium no meu ambiente) e a UI real no navegador com faixas de catálogo preenchidas, nem a reprodução de um MP3 do catálogo. Fazer antes de publicar.

## 5. Comandos confirmados
`npm ci` · `npm run dev` · `npm run typecheck` · `npm test` · `npm run build` · `npm run preview` · `npm run test:e2e` (requer Chromium/Playwright). Node ≥ 22.12.

## 6. Próximas tarefas (ordem)
1. Aplicar o patch, rodar `npm run test:e2e` e corrigir regressões; adicionar um teste e2e com `catalog.json` de exemplo (mock de `/catalog.json`).
2. Testar no navegador uma faixa real do catálogo (play, busca, playlist, recarregar).
3. Estado de carregamento/vazio do catálogo na home e na busca (mensagem "adicione suas músicas").
4. Dividir `App.tsx` em componentes (Home, Busca, Biblioteca, Player) sem mudar o visual.
5. Persistir importações locais (IndexedDB) — avaliar antes de backend.
6. Backend (ex.: Supabase) + upload de áudio autorizado + auth: **só com projeto e credenciais fornecidos pelo dono, em projeto separado dos outros sites dele.**
7. Configurar lint.

## 7. Decisões e pontos que exigem autorização do dono
- JSON estático em vez de banco: zero dependência nova, trocável via `CATALOG_URL`.
- `rights` obrigatório por faixa, para registrar autorização.
- Não implementados (por regra do projeto): download/extração de streaming, scraping, catálogo comercial, pagamentos, IA, painel admin.
- Precisa de autorização: criar backend/Supabase, adicionar dependências, mudar layout.

## 8. Continuação pelo Codex — 19/10/2026

As seções anteriores registram a entrega do Claude. Esta seção atualiza o estado após a aplicação e os testes no ambiente em nuvem.

O ZIP recebido continha os arquivos completos, não `galada-catalogo.patch`. Eles foram comparados com o checkout limpo em `57e2ada` e aplicados. Nenhum commit ou push foi feito.

Tarefas da seção 6, na ordem:

1. **Concluída:** arquivos aplicados; os 18 testes e2e existentes passaram. Novos testes de catálogo usam mock de `/catalog.json` e MP3 sintético original para validar busca, reprodução, favoritos, playlist e recarga. Validação de URL também rejeita HTTPS malformado, credenciais embutidas e caminhos com barras invertidas/caracteres de controle.
2. **Concluída:** catálogo de uma cópia temporária do build servido por HTTP, sem mock, validado no navegador desktop e mobile. Incluiu gênero próprio, busca, play, criação de playlist e recarga. O catálogo versionado continua vazio.
3. **Concluída:** home e busca mostram carregamento e orientação para adicionar músicas quando o catálogo próprio está vazio. Falhas e itens rejeitados mantêm a demonstração disponível. Gêneros adicionados no JSON entram nos filtros.
4. **Concluída:** extraídos `Home`, `SearchPage`, `LibraryPage`, `Player`, `CatalogNotice`, `IconButton`, `EmptyState` e o utilitário de tempo. O `App.tsx` coordena os estados e os diálogos. A extração preservou seis capturas de tela sem diferença; nenhum CSS foi alterado.
5. **Concluída:** `useLocalTracks` e `localAudioStore` salvam bytes e metadados no IndexedDB, restauram object URLs e preservam os IDs anteriores. Reabertura não duplica a faixa. Sem suporte ou espaço, o áudio segue na sessão e um aviso explica a limitação. Limpar dados do site remove os áudios salvos. Não há upload.
6. **Pendente de autorização:** backend, upload e autenticação não foram implementados. Dependem da autorização do dono, projeto separado e credenciais entregues com segurança; a restrição não impede as demais tarefas locais.
7. **Concluída:** ESLint configurado com TypeScript e regras de hooks React. O dono foi avisado antes de adicionar as cinco ferramentas de desenvolvimento. Nenhuma dependência de execução foi adicionada.

Resultado final: `npm ci`, lint, typecheck e build aprovados; **23 testes unitários e 32 e2e aprovados**, sem testes ignorados. O teste de produção sem mock passou em ambos os layouts. Detalhes e limites estão em `docs/VALIDACAO.md`; o README explica o formato de `public/catalog.json` e a persistência local.

`install_script` e `start_skill` foram salvos no rascunho do ambiente. O script foi executado; o início do servidor e as requisições de prontidão foram validados. Ainda falta o usuário revisar/salvar as configurações e publicar o ambiente. A restauração em uma nova tarefa não foi testada.

Próximo passo do dono: cadastrar somente músicas/capas próprias ou autorizadas no JSON conforme o README e revisar as alterações locais antes de enviá-las ao GitHub. A declaração `rights` registra a autorização informada; não concede direitos de terceiros. Backend continua sendo uma decisão separada, sem credenciais no frontend ou no chat.

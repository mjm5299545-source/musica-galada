# Arquitetura da aplicação

## Base e limites

A aplicação é uma interface original de música desenvolvida em React e TypeScript, com Vite para desenvolvimento e compilação estática. A escolha cria uma base pequena e verificável para um repositório que inicialmente não possuía código executável.

O produto funciona como demonstração local. Catálogo e mídia de demonstração não representam integração com um serviço comercial. O HTML fornecido orientou a identificação de padrões gerais de navegação; seus bundles, dados comerciais e elementos proprietários não fazem parte da aplicação.

## Responsabilidades

- A camada de catálogo fornece metadados de faixas, artistas, álbuns e coleções demonstrativas.
- A interface apresenta navegação, busca, biblioteca e seleção de conteúdo a partir desses dados.
- O estado de reprodução coordena faixa atual, fila e controles do player. A reprodução utiliza somente fontes de áudio autorizadas ou produzidas para a demonstração.
- O estado de biblioteca mantém as escolhas locais do usuário, sem criar contas ou transmitir dados a terceiros.
- Os estilos definem identidade visual, layout responsivo, foco visível e respeito à preferência por movimento reduzido.

O catálogo deve ser a fonte dos identificadores usados pela interface, pela fila e pelas playlists. A interface não deve manter cópias independentes do estado de reprodução. Erros de reprodução e indisponibilidade de persistência precisam resultar em mensagens compreensíveis, sem impedir a navegação.

## Contratos de dados

`src/types.ts` define `Track` com identificador, título, artista, álbum, gênero, duração, capa, origem do áudio e URL de reprodução. A origem distingue demonstrações (`demo`) de arquivos escolhidos localmente (`local`). `Playlist` reúne identificador, nome e uma lista de identificadores de faixas. O modo de repetição aceita `off`, `all` e `one`.

A duração é expressa em segundos. Metadados e referências de mídia devem permanecer separados: uma entrada de catálogo não comprova que o navegador conseguirá decodificar ou reproduzir uma fonte de áudio.

## Organização implementada

| Caminho | Responsabilidade |
| --- | --- |
| `src/main.tsx` | Monta a aplicação React e importa os estilos globais. |
| `src/App.tsx` | Compõe as seções, navegação por hash, busca, importação local, diálogos e controles da interface. |
| `src/types.ts` | Define os contratos compartilhados de faixas, playlists e repetição. |
| `src/data/catalog.ts` | Descreve seis faixas sintéticas de demonstração e seus arquivos locais. |
| `src/hooks/useAudioPlayer.ts` | Gerencia o elemento de áudio, fila, seleção, reprodução, progresso, volume, mudo, aleatório e repetição. |
| `src/hooks/useLibrary.ts` | Gerencia favoritos e criação, renomeação, exclusão e conteúdo de playlists. |
| `public/media/` | Contém os arquivos de áudio da demonstração. |
| `public/artwork/` | Contém as ilustrações SVG originais. |

O player cria um elemento de áudio para a fonte selecionada e sincroniza a interface a partir dos eventos da mídia. Ao trocar a fonte, remove os ouvintes e interrompe o elemento anterior; falhas de carregamento ou reprodução são expostas à interface.

A biblioteca usa a chave versionada `galada-library:v1` no `localStorage`. Volume e mudo usam chaves próprias. Dados armazenados são validados ao carregar; JSON inválido e esquemas desconhecidos resultam em biblioteca vazia. Se o navegador bloquear o armazenamento ou exceder sua cota, as alterações continuam em memória e podem ser perdidas ao recarregar. Não há sincronização entre dispositivos ou contas.

## Navegação e arquivos locais

A navegação usa fragmentos de URL: `#descobrir`, `#buscar`, `#biblioteca` e `#playlist/<id>`. Não há requisições de página ao servidor para essas seções; uma rota desconhecida apresenta um estado de página não encontrada.

A busca considera título, artista, álbum e gênero, sem diferenciar acentos ou maiúsculas. Os filtros de gênero operam sobre o catálogo disponível no navegador.

A importação abre arquivos escolhidos pelo usuário com URLs locais do navegador, sem enviar áudio a um servidor. O navegador precisa conseguir ler os metadados e decodificar o formato. A interface limita cada seleção a 30 arquivos e cada arquivo a 100 MB. Uma extensão aceita não garante suporte do navegador ao codec.

Os bytes dos arquivos importados não são gravados no armazenamento persistente; precisam ser abertos novamente após recarregar. O identificador considera nome, tamanho e data de modificação do arquivo, permitindo reencontrar referências de favoritos e playlists quando o mesmo arquivo é reaberto. Alterações nesses atributos podem produzir outro identificador; não há comparação criptográfica do conteúdo nem sincronização de arquivos.

As URLs locais são liberadas quando a aplicação é desmontada. A fila e a posição de reprodução pertencem à sessão atual.

## Mídia de demonstração

`scripts/generate_demo.py` produz as composições sintéticas e as ilustrações originais do projeto. A execução opcional requer Python 3 e ffmpeg, sem pacotes Python externos ou rede. Os assets já acompanham o repositório e não precisam ser regenerados para executar a aplicação.

O crédito `Galada Lab` identifica a produção sintética da demonstração, sem atribuição a artistas reais. Não foram incorporados gravações, samples, capas ou melodias de terceiros. A demonstração não oferece licença ou integração para reproduzir um catálogo comercial externo.

## Comandos do projeto

Use Node.js 22.12 ou superior e instale dependências pelo lockfile com `npm ci`.

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento, acessível pela interface de rede do ambiente. |
| `npm run typecheck` | Valida os tipos TypeScript. |
| `npm test` | Executa os testes unitários com Vitest. |
| `npm run test:e2e` | Executa os testes de navegador com Playwright; exige navegador compatível instalado. |
| `npm run build` | Valida tipos e produz os arquivos estáticos em `dist/`. |
| `npm run preview` | Serve a compilação de produção para conferência local. |

Os comandos de teste representam pontos de validação; seus resultados devem ser informados a partir da execução. Não há comando de lint configurado no manifesto.

## Acessibilidade e comportamento

As ações usam elementos semânticos, nomes acessíveis e suporte a teclado. Os controles de progresso e volume precisam informar seus valores. Controles indisponíveis devem apresentar estado desabilitado; busca, listas vazias e erros devem informar o que ocorreu.

O player permanece acessível entre as seções da aplicação. Layouts menores precisam reservar espaço para o player e para a navegação sem ocultar o conteúdo. Animações devem respeitar `prefers-reduced-motion`.

## Integrações futuras

Um catálogo real exige API documentada, modelo de dados, tratamento de falhas e autorização do provedor. Áudio comercial exige direitos de uso e um mecanismo de reprodução autorizado. Contas, sincronização entre dispositivos e playlists compartilhadas exigem backend e autenticação próprios.

Segredos não devem ser incluídos no código cliente nem em variáveis de compilação expostas ao navegador. Tokens privados devem permanecer em um serviço de backend. O documento HTML de referência não fornece esses pré-requisitos.

Nenhuma integração externa é necessária para executar a demonstração local. A instalação das dependências de desenvolvimento requer acesso ao registro de pacotes utilizado pelo lockfile.

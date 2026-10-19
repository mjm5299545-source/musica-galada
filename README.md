# Galada

Uma plataforma de música demonstrativa com identidade visual original, catálogo local e player de áudio. Desenvolvida em React, TypeScript e Vite.

O repositório começou apenas com um título em `README.md`. O HTML fornecido como referência era uma página renderizada, sem seus bundles de aplicação; a base atual foi criada originalmente para este projeto. O diagnóstico está em [docs/DIAGNOSTICO.md](docs/DIAGNOSTICO.md) e a organização técnica em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Executar

Requisitos: Node.js **24** (recomendado) ou **22.13 ou superior na série 22** e npm.

```sh
npm ci
npm run dev
```

Abra o endereço apresentado pelo Vite, normalmente `http://localhost:5173`. O servidor aceita conexões pela interface de rede do ambiente.

Para conferir a versão de produção:

```sh
npm run build
npm run preview
```

O build gera arquivos estáticos em `dist/`. As seções usam navegação por hash, como `#buscar` e `#biblioteca`.

## Recursos

- Catálogo com seis composições sintéticas curtas e capas originais.
- Busca por faixa, artista, álbum ou gênero, com filtros.
- Reprodução, pausa, progresso, volume, mudo, próxima/anterior, fila, aleatório e repetição.
- Favoritos e playlists com criação, renomeação, exclusão e adição ou remoção de faixas.
- Abertura de áudio do dispositivo, com persistência no navegador (IndexedDB), sem upload.
- Catálogo próprio editável em `public/catalog.json`, com declaração de direitos por faixa.
- Layout responsivo, navegação por teclado e preferência por movimento reduzido.

O modo de demonstração é identificado na interface. Não há contas, backend, sincronização entre dispositivos, assinaturas ou catálogo de streaming comercial. Nenhuma chave de API é necessária para a demonstração.

## Dados locais

Favoritos, playlists, volume e mudo são salvos no `localStorage` deste navegador. Limpar os dados do site remove essas escolhas. Se o armazenamento estiver bloqueado ou sem espaço, a aplicação continua em memória, mas as alterações podem não sobreviver ao recarregamento.

Os arquivos de áudio escolhidos são salvos no **IndexedDB deste navegador**, com seus metadados, e restaurados ao recarregar. Seus bytes não são enviados a servidores. Se o armazenamento estiver indisponível ou sem espaço, a aplicação avisa e os novos arquivos continuam disponíveis apenas na sessão. Não há sincronização entre dispositivos; o navegador pode remover dados por falta de espaço ou ao encerrar uma sessão privada. Para remover os áudios salvos, limpe os dados deste site nas configurações do navegador; isso também remove favoritos e playlists.

Os identificadores antigos são preservados: a identificação considera **nome, tamanho e data de modificação**. Renomear ou modificar um arquivo pode gerar uma referência diferente. Reabrir o mesmo arquivo não cria uma faixa duplicada.

A importação aceita até 30 arquivos por seleção, com até 100 MB por arquivo. A reprodução depende dos formatos e codecs suportados pelo navegador. A fila e a posição da reprodução não são persistidas.

## Seu catálogo JSON

Coloque apenas áudios e capas que você criou ou está autorizado a usar em `public/media/` e `public/artwork/`. Edite `public/catalog.json`:

```json
{
  "tracks": [
    {
      "id": "minha-faixa-01",
      "title": "Minha música",
      "artist": "Meu nome",
      "album": "Meu álbum",
      "genre": "MPB",
      "src": "/media/minha-musica.mp3",
      "cover": "/artwork/minha-capa.svg",
      "rights": "Obra própria"
    }
  ]
}
```

Título, artista, áudio (`src`) e declaração de direitos (`rights`) são obrigatórios. O campo `id` é opcional, mas um identificador estável evita perder as referências de favoritos e playlists ao renomear a música. Álbum, gênero, capa e duração em segundos são opcionais; sem duração, o player usa os metadados do áudio. Sem `id`, o identificador é gerado a partir de artista e título. IDs repetidos são ignorados com um aviso.

Áudio e capa aceitam caminhos do próprio site iniciados por `/` ou URLs HTTPS válidas, sem credenciais na URL. Não use links de páginas de streaming: o player precisa de um arquivo de áudio autorizado e compatível com o navegador. Arquivos locais no projeto evitam depender de permissões ou disponibilidade de terceiros. O campo `rights` registra sua declaração; não concede direitos sobre obras de terceiros.

O catálogo começa vazio e preserva as seis composições de demonstração. As faixas cadastradas aparecem na home, na busca (incluindo seus gêneros) e nas playlists. JSON inválido ou itens rejeitados geram um aviso sem interromper a demonstração. Depois de editar o catálogo, recarregue a página; para uma publicação estática, faça um novo build e publique os arquivos atualizados de `dist/`.

## Verificações

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`typecheck` verifica TypeScript, `test` executa os testes unitários com Vitest e `test:e2e` executa os fluxos de navegador com Playwright. `lint` executa ESLint com regras de TypeScript e hooks React, sem aceitar avisos.

A suíte de navegador precisa de Chromium e de suas bibliotecas de sistema. Pode usar o Chromium do sistema em `/usr/bin/chromium`; quando ele não estiver disponível, instale o navegador gerenciado pelo Playwright:

```sh
npx playwright install chromium
npm run test:e2e
```

O Playwright inicia o servidor na porta 4173 ou reutiliza um servidor já disponível nessa porta. Resultados de testes devem ser avaliados a partir da execução; a existência dos comandos não significa que passaram em todo ambiente.

## Origem da mídia

As seis faixas MP3 e as ilustrações SVG foram geradas originalmente para este projeto. Não usam gravações, samples, capas ou melodias de terceiros. **Galada Lab** identifica a produção sintética da demonstração e não atribui as faixas a artistas reais.

Os arquivos em `public/media/` e `public/artwork/` já acompanham o projeto. Não é necessário regenerá-los para desenvolver ou executar o site. Para recriá-los, opcionalmente, instale Python 3 e ffmpeg e execute:

```sh
python3 scripts/generate_demo.py
```

O gerador não requer dependências Python externas nem acesso à rede. Ele reescreve os arquivos de mídia e arte gerados. O HTML de referência, seus dados comerciais e os recursos proprietários do serviço referenciado não foram incorporados à aplicação.

# Galada

Uma plataforma de música demonstrativa com identidade visual original, catálogo local e player de áudio. Desenvolvida em React, TypeScript e Vite.

O repositório começou apenas com um título em `README.md`. O HTML fornecido como referência era uma página renderizada, sem seus bundles de aplicação; a base atual foi criada originalmente para este projeto. O diagnóstico está em [docs/DIAGNOSTICO.md](docs/DIAGNOSTICO.md) e a organização técnica em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Executar

Requisitos: Node.js **22.12 ou superior** e npm.

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
- Abertura de áudio do dispositivo, sem upload.
- Layout responsivo, navegação por teclado e preferência por movimento reduzido.

O modo de demonstração é identificado na interface. Não há contas, backend, sincronização entre dispositivos, assinaturas ou catálogo de streaming comercial. Nenhuma chave de API é necessária para a demonstração.

## Dados locais

Favoritos, playlists, volume e mudo são salvos no `localStorage` deste navegador. Limpar os dados do site remove essas escolhas. Se o armazenamento estiver bloqueado ou sem espaço, a aplicação continua em memória, mas as alterações podem não sobreviver ao recarregamento.

Os arquivos de áudio escolhidos ficam disponíveis apenas durante a sessão. Seus bytes não são enviados a servidores nem persistidos pelo aplicativo. Após recarregar, abra novamente os mesmos arquivos para recuperar as referências de favoritos e playlists: a identificação considera **nome, tamanho e data de modificação**. Renomear ou modificar um arquivo pode gerar uma referência diferente.

A importação aceita até 30 arquivos por seleção, com até 100 MB por arquivo. A reprodução depende dos formatos e codecs suportados pelo navegador. A fila e a posição da reprodução não são persistidas.

## Verificações

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`typecheck` verifica TypeScript, `test` executa os testes unitários com Vitest e `test:e2e` executa os fluxos de navegador com Playwright. O manifesto não define um comando de lint separado.

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

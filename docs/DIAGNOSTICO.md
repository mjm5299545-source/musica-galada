# Diagnóstico do material inicial

## Escopo inspecionado

O checkout inicial de `main` continha somente `README.md`, cujo conteúdo era o título do repositório. A árvore do commit e o índice do Git não incluíam aplicação, configuração de compilação, manifesto de dependências, lockfile, estilos, mídia ou testes. Não havia sparse checkout, submódulos ou ponteiros Git LFS ocultando código. O estado de trabalho estava limpo antes da implementação.

Também foram fornecidos dois anexos: um roteiro de engenharia reversa e um documento HTML exportado de uma página do Apple Music em português. Esses anexos são referências para o trabalho; não constituem o código-fonte do repositório.

## O que o HTML permite concluir

O HTML tem aproximadamente 2,35 MB e contém marcação já renderizada, navegação, cards, imagens, controles e diálogos. Classes com prefixo `svelte-` e comentários `HEAD_svelte` evidenciam uma aplicação compilada com Svelte; não é possível determinar a versão ou recuperar seus componentes originais apenas por essa marcação.

A aparência e o comportamento dependem de arquivos que não vieram no anexo:

- JavaScript principal em `/assets/index~bc39edf62f.js`.
- CSS principal em `/assets/index~815bd2067a.css`.
- Dois bundles de componentes MusicKit v3 em `/includes/js-cdn/`.
- Fontes hospedadas em `www.apple.com` e imagens em `is1-ssl.mzstatic.com`.

Um bloco `serialized-server-data` contém dados de apresentação de 19 seções, referências de catálogo, imagens, destinos de navegação e métricas. Dados serializados não substituem serviços de catálogo, lógica do player, autenticação nem autorização de reprodução. Não há credencial de integração utilizável fornecida pelo anexo. Nenhum valor de autenticação foi copiado para a aplicação ou para a documentação.

Servir o HTML isoladamente não entrega o produto: os caminhos relativos apontam para bundles ausentes e diversos links levam ao serviço externo. A análise foi estática; não houve tentativa de recuperar bundles, executar scripts do anexo ou utilizar seu catálogo.

## Situação antes das alterações

| Categoria | Evidência inicial |
| --- | --- |
| Já funciona | Checkout Git e leitura do `README.md`. |
| Parcial | Referência visual e estrutural disponível como HTML renderizado. |
| Quebrado como aplicação independente | Referências a CSS e JavaScript que não acompanham o HTML. |
| Ausente | Projeto executável, componentes-fonte, configuração de desenvolvimento, estilos próprios, áudio local e verificações automatizadas. |
| Dependente de serviço externo | Catálogo comercial, contas, streaming, direitos de reprodução e integração MusicKit do serviço referenciado. |

## Decisão de implementação

Foi autorizada a criação de um site original com React, Vite e TypeScript. Como não existia aplicação anterior a preservar, a menor base sustentável é uma aplicação cliente com catálogo demonstrativo local, identidade visual própria, busca, biblioteca, playlists e reprodução de áudio sintético produzido para a demonstração.

O modo demonstrativo deve estar identificado na interface. Não serão reutilizados código compilado, logotipos, capas, fontes ou gravações do serviço referenciado. Não há backend, login, pagamento, letras, recomendações de IA ou acesso a streaming comercial configurado. A inclusão desses recursos depende de implementação e autorização próprias.

As verificações de execução e os recursos efetivamente entregues devem ser avaliados sobre os arquivos da nova aplicação, e não inferidos a partir do HTML de referência.

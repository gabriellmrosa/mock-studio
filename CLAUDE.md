# Instruções para assistentes

## Versão e releases

A versão do app vem do `package.json` e aparece no painel de objetos (ex.: `v1.2.0`). Cada release publicado ganha uma tag no git (`v1.0.0`, `v1.1.0`, …). Subir a versão é decisão de produto, então quem decide é o usuário — o assistente só nota e pergunta.

Quando perguntar se vale subir a versão:

- ao preparar um merge para a `main` (publicação);
- ao começar uma sessão ou fazer um commit, se já houver 5 commits ou mais desde a última tag — conferir com `git describe --tags --abbrev=0` e `git rev-list --count <tag>..HEAD`.

Ao perguntar, sugerir o número com base no que entrou desde a última tag (versionamento semântico):

- **patch** (`1.1.0` → `1.1.1`): só correções;
- **minor** (`1.1.0` → `1.2.0`): funcionalidades novas, sem quebrar nada do que existia — templates salvos continuam abrindo;
- **major** (`1.1.0` → `2.0.0`): algo que existia deixa de funcionar ou muda de forma incompatível.

Resumir em poucas linhas o que entrou, para o usuário decidir. Não subir a versão sem confirmação, e não perguntar de novo na mesma sessão se o usuário recusou.

Para subir, depois do "sim": `npm version <patch|minor|major>` — atualiza o `package.json`, faz o commit e cria a tag. O push (incluindo a tag, com `git push --follow-tags`) é o usuário quem faz.

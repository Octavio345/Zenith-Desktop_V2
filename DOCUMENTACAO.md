# Documentação técnica

## Visão geral

O Zenith é uma SPA feita em React e Vite, com Firebase Authentication e Firestore. A aplicação tem três áreas principais:

- acesso e cadastro;
- operação agrícola;
- perfil e gestão de equipe.

O proprietário administra fazenda, funcionários, tarefas e atividades. O funcionário vê apenas o que foi destinado a ele, registra a jornada e atualiza o andamento das próprias tarefas. A autorização real fica nas regras do Firestore; a interface só complementa essa proteção.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
```

O build é gerado em `dist`. A Vercel usa `vercel.json` para o fallback de rotas da SPA e para a rota de retorno do Firebase Authentication.

## Rotas e acesso

As rotas ficam em `src/App.jsx`.

| Rota | Acesso |
| --- | --- |
| `/`, `/login`, `/register`, `/forgot-password` | público |
| `/cadastrar-fazenda`, `/home`, `/profile`, `/explore` | usuário autenticado e ativo |
| `/equipe`, `/admin/team` | proprietário/gestor com e-mail confirmado |

`AccountRoute` monitora o documento do usuário. Quando `archived` é `true` ou `accessStatus` é `blocked`, a sessão é encerrada e a pessoa é enviada ao login.

`TeamRoute` também confere `emailVerified`. A confirmação é enviada no cadastro do proprietário e pode ser reenviada na tela de bloqueio da equipe.

## Papéis

Os papéis são definidos em `src/services/accessControl.js`.

| Papel | Valor salvo | Uso |
| --- | --- | --- |
| Proprietário/gestor | `admin` | administra fazenda, equipe, tarefas e atividades |
| Funcionário | `employee` | acessa jornada e tarefas próprias |
| Colaborador | `collaborator` | segue o mesmo fluxo operacional do funcionário |

O bloqueio de funcionário não exclui a conta fisicamente. O painel marca o perfil assim:

```js
{
  archived: true,
  accessStatus: "blocked",
  archivedAt: "..."
}
```

Ele desaparece da equipe e perde acesso ao sistema, mas o histórico continua no Firebase.

## Dados no Firestore

### `users/{uid}`

Perfil, papel, vínculo e status do usuário.

```js
{
  name,
  email,
  role: "admin" | "employee" | "collaborator",
  ownerId,
  teamId,
  archived,
  accessStatus,
  phone,
  document,
  age,
  type,
  employmentType,
  position,
  sector,
  status,
  entry,
  exit,
  hours,
  createdAt,
  updatedAt
}
```

Em contas de equipe, `ownerId` e `teamId` apontam para o UID do proprietário.

### `farms/{farmId}`

Dados da propriedade, sempre vinculados por `ownerId`.

```js
{
  ownerId,
  name,
  area_total,
  plantacao,
  municipio,
  uf,
  bairro,
  cep,
  data_aquisicao,
  telefone,
  tipo_proprietario,
  createdAt,
  updatedAt
}
```

### `tasks/{taskId}`

Tarefa individual criada no painel Equipe.

```js
{
  ownerId,
  employeeId,
  title,
  due,
  status: "pendente" | "andamento" | "concluida",
  startedAt,
  completedAt,
  ownerConfirmedAt,
  createdAt,
  updatedAt
}
```

O funcionário inicia e conclui apenas itens próprios. O proprietário confirma a finalização. Depois da confirmação, o item deixa de aparecer na interface após duas horas; a regra está em `src/services/workItemLifecycle.js`.

### `activities/{activityId}`

Atividades criadas na aba Atividades. Podem ser gerais ou destinadas a uma pessoa.

```js
{
  ownerId,
  scope: "general" | "individual",
  assigneeId,
  title,
  description,
  type,
  priority,
  date,
  time,
  status,
  startedAt,
  completedAt,
  ownerConfirmedAt,
  createdAt,
  updatedAt
}
```

Atividades `general` são lidas pela equipe vinculada à fazenda. Atividades `individual` são lidas pelo proprietário e pelo funcionário indicado em `assigneeId`.

## Regras do Firestore

`firestore.rules` cobre as coleções de usuários, fazendas, tarefas e atividades. Em resumo:

- administrador cria o próprio perfil;
- administrador com e-mail confirmado cria e edita a própria equipe;
- funcionário atualiza apenas a própria jornada e tarefas destinadas a ele;
- proprietário controla tarefas e atividades da própria equipe;
- exclusão física de perfis pelo cliente não é permitida;
- qualquer coleção não declarada fica bloqueada.

Para publicar as regras:

```bash
firebase use zenith-agro
firebase deploy --only firestore:rules
```

Se o projeto Firebase tiver outro nome, use o nome correto no primeiro comando.

## Fluxos importantes

### Proprietário

1. Cria a conta em `/register`.
2. O perfil é gravado com `role: "admin"`.
3. Recebe o e-mail de confirmação.
4. Cadastra a fazenda em `/cadastrar-fazenda`.
5. Depois de confirmar o e-mail, pode abrir `/equipe` e criar acessos de funcionário.

### Funcionário

1. Recebe um login criado pelo proprietário.
2. Entra escolhendo o modo Funcionário.
3. Na Home, registra entrada e saída.
4. Recebe tarefas individuais e atividades gerais em tempo real.
5. Inicia, finaliza e aguarda a confirmação do proprietário.

### Criação de funcionário

O painel usa uma instância secundária do Firebase Auth para criar a nova conta sem derrubar a sessão do proprietário. O perfil do funcionário é salvo em `users` com `ownerId`, `teamId` e papel operacional.

## Módulos

| Módulo | Arquivo principal | Persistência |
| --- | --- | --- |
| Diagnóstico | `components/App/Explore/Diagnostico/DiagnosticoTab.jsx` | histórico local e ocorrências locais |
| Plantio | `components/App/Explore/Monitoramento/` | API externa |
| Clima | `services/weatherService.js` | consulta externa por cidade e UF |
| Diário | `components/App/Explore/DiarioTab.jsx` | `localStorage["diaryEntries"]` |
| Mapa | `components/App/Explore/MapaTab.jsx` | `localStorage["farmPolygons"]` |
| Estoque | `components/App/Explore/EstoqueTab.jsx` | `localStorage["inventory"]` |
| Atividades | `components/App/Explore/AtividadesTab.jsx` | Firestore |

### Diagnóstico, plantio e 3D

Endpoints configuráveis:

```env
VITE_SOJA_API_URL=
VITE_MONITORAMENTO_API_URL=
VITE_MODELO_3D_API_URL=
```

- `src/services/sojaApi.js` envia imagem ou lote para diagnóstico de soja.
- `src/services/monitoramentoService.js` analisa imagem de plantio.
- `src/services/modelo3dApi.js` cria tarefas de reconstrução 3D com 2 a 40 imagens.

### Clima

O clima é consultado com a cidade e a UF da fazenda. A implementação está em `src/services/weatherService.js`. A chave atual do OpenWeatherMap está no arquivo de serviço; antes de abrir um novo ambiente público, migre-a para uma configuração adequada e rotacione a chave existente, se ela já tiver sido exposta.

### Dados locais

Diário, estoque, áreas do mapa e parte do histórico de diagnóstico permanecem no navegador. Eles não são sincronizados automaticamente entre computadores. Antes de depender deles como dado operacional definitivo, migre o módulo para Firestore ou implemente exportação e backup.

## Variáveis de ambiente

O repositório ignora `.env` e `.env.example`. Para desenvolvimento local, crie `.env` com:

```env
VITE_SOJA_API_URL=
VITE_MONITORAMENTO_API_URL=
VITE_MODELO_3D_API_URL=
VITE_ZENITH_PHONE=
VITE_ZENITH_EMAIL=
VITE_ZENITH_INSTAGRAM=
```

Variáveis `VITE_` são públicas no bundle. Não coloque senhas, chaves administrativas ou credenciais de servidor nesse arquivo.

## PWA e cache

O service worker é configurado em `vite.config.js`. Se uma publicação continuar exibindo uma tela antiga:

1. faça hard reload;
2. teste em janela anônima;
3. remova o service worker antigo nas DevTools, se necessário;
4. gere e publique novo build.

## Checklist de publicação

1. Execute `npm run build`.
2. Publique regras do Firestore quando houver alteração em permissões.
3. Revise domínios autorizados no Firebase Authentication.
4. Teste gestor e funcionário em sessões separadas.
5. Teste confirmação de e-mail, criação de equipe, bloqueio de acesso, jornada, tarefa e confirmação de conclusão.
6. Teste cache do PWA em produção.

## Pontos de atenção

- A configuração Firebase ainda está em `src/services/firebase.js`; para ambientes diferentes, atualize esse arquivo de forma consciente.
- O bundle de produção é grande. Quando necessário, use `React.lazy` e imports dinâmicos para dividir módulos pesados por rota.
- Não trate a interface como mecanismo de segurança: alterações de permissão exigem revisão de `firestore.rules`.

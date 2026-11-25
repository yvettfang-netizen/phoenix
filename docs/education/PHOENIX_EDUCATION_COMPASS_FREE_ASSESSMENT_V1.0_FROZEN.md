# PHOENIX NOVA｜EDUCATION COMPASS FREE ASSESSMENT V1.0

**P0 SPEC FROZEN — READY FOR IMPLEMENTATION REVIEW**

| 项目 | 依据 |
| --- | --- |
| 产品名称 | Phoenix Education Compass™｜凤启教育罗盘 |
| 产品入口 | Free Education Assessment |
| 规格版本 | `education-compass-free-assessment.v1.0` |
| 评审 | Founder 产品审批，GPT-6 架构审查 |
| 来源 | Founder 本轮提供的《Founder Product Freeze｜Codex P0 执行指令》，原始输入 SHA-256 `ebd20a5e05f977579d33212f06ef0460cbb01fb59160a313a982a0dc1c5361dc` |
| 工程基线 | [Phoenix main](https://github.com/yvettfang-netizen/phoenix/commit/e5d72abfda656da695cc05e90054d90632353c89) |
| 文件范围 | 官网、微信小程序、Canonical Assessment、CRM 授权与 Growth Snapshot 共用本规格 |

## 一、免费初评与适用范围

匿名可以完成，结果立即显示。体验目标 3–5 分钟。基础 8 题，Q1 决定一个主分支，最多 4 道动态题，总数不超过 12。结果免费。注册、姓名、电话、成绩单均为非前置条件。填答者可以回改和跳过非必要问题，亦可在结果后明示选择联系。

移动端一屏一题，使用大卡片和清楚的实际进度，随答案分流并提供适当反馈。文案保持轻量，结果依据当前证据，避免制造焦虑、贴人格或天赋标签。免费四卡可独立使用。

本文件为免费 8+4 产品规格权威。此前的 Question-to-Data 草案中历史 FP01–FP08 对照只用于来源追溯。已签 Level 1/Level 2、原生 23 题和付费业务继续按各自的有效版本管理。

## 二、Question Registry 与来源

第三、四节保留 Founder 给出的题文、选项、字段及特殊约束。工程题号为基础 `Q1–Q8`、动态槽位 `Q9–Q12`。动态题的唯一 `question_id` 为 `Q9.A` 至 `Q12.E` 的实际 20 个变体，另存展示槽位 `question_slot`。中文文案和显示顺序均不作为数据库主键。

初始 `question_version = edu-free-questions.v1.0`，`branch_version = edu-free-branches.v1.0`，`rule_version = edu-free-rules.v1.0`。每次评估保存这三个版本及注册表摘要。版本包括题目、Enum、分支、跳题与规则，回改依据原版本重算。行为变更需新版本和审批，历史回答不重新解释。

## 三、唯一题库：Q1–Q8

必须保留以下题目和选项。

### Q1｜主要教育困惑

题目：

孩子的未来，你现在最想弄清楚哪件事？

选项：

A. 不知道孩子未来适合走哪条升学路线。
B. DSE、A-Level、IB，到底应该怎么选择？
C. 想申请香港大学，但不知道现在差距在哪里。
D. 成绩还可以，但不知道孩子真正的优势在哪里。
E. 考虑香港、内地或海外，不知道如何规划。

字段：
`primary_concern`

Enum：
- PATHWAY_UNCLEAR
- CURRICULUM_CHOICE
- HK_ADMISSION_GOAL
- GROWTH_EXPLORATION
- MULTI_REGION_PLANNING

Q1 决定主要动态分支。

### Q2｜教育阶段

题目：

孩子现在读几年级？

选项：
- 中一 / Year 7
- 中二 / Year 8
- 中三 / Year 9
- 中四 / Year 10
- 中五 / Year 11
- 中六 / Year 12
- 其他中学阶段

字段：
- education_stage
- grade_level_raw
- grade_system
- grade_label

保留原始年级，不得自动假定不同国家的年级完全等同。

### Q3｜课程体系

题目：

孩子目前就读什么课程体系？

选项：
- 香港 DSE
- IGCSE / A-Level
- IB
- AP / 美式课程
- 内地普通高中
- 国际学校其他课程
- 还没有确定

字段：
- education_system
- curriculum_stage
- curriculum_subjects
- curriculum_transition_status

### Q4｜学习状态

题目：

从日常观察来看，哪一种更符合孩子？

选项：
- 成绩比较稳定，学习目标也明确。
- 成绩不错，但还没有找到真正感兴趣的方向。
- 有喜欢的领域，但成绩不够稳定。
- 不同科目表现差异比较大。
- 学习比较被动，需要别人安排和推动。
- 还不太清楚孩子的真实学习状态。

字段：
`learning_state_self_reported`

必须记录回答者身份，不得把家长观察直接当作学生本人确认的事实。

### Q5｜兴趣与实践

题目：

孩子在哪些事情上容易投入时间？

允许多选：

- 数学、科学、工程、AI、科技。
- 商业、经济、金融、创业。
- 语言、写作、阅读、表达。
- 传媒、设计、艺术、创意。
- 医学、生物、心理及健康。
- 体育、领导力、社会活动。
- 项目实践、动手创造、解决问题。
- 兴趣比较广泛，还没有特别明显的方向。
- 目前不太清楚。

字段：
- interest_domains
- engagement_evidence
- engagement_duration
- growth_evidence_types

另行询问是否存在持续项目、比赛、作品或实践经历。

不得将兴趣直接解释为天赋。

### Q6｜目标升学地区

题目：

未来希望孩子在哪些地区升学？

最多选择两个：

- 香港
- 英国
- 美国
- 澳大利亚
- 加拿大
- 新加坡
- 中国内地
- 暂时没有决定，希望比较不同地区。

字段：
- preferred_regions
- primary_preferred_region
- region_decision_status

记录家庭偏好，不自动认定招生资格。

### Q7｜学术表现

题目：

目前孩子的学术表现更接近哪一种？

选项：

- 各科表现比较稳定。
- 有一两门明显优势科目。
- 部分科目存在明显短板。
- 成绩波动比较大。
- 正在适应新的课程体系。
- 暂时不清楚。

字段：
- academic_self_report
- academic_period
- result_type
- result_source
- verification_status

具体 DSE、A-Level、IB、AP 和普高成绩为可选附加资料，不强制采集。

### Q8｜家庭长期目标

题目：

未来三年，你最希望孩子实现什么？

选项：

- 找到适合孩子的大学和专业。
- 选择更适合的课程体系。
- 争取进入理想的香港大学。
- 发现并发展孩子的成长优势。
- 提升学术能力和学习效率。
- 提前做好香港或海外升学规划。
- 目前还不确定，希望有人帮助梳理。

字段：
- family_goal
- family_goal_priority
- family_goal_time_horizon
- goal_alignment_status

分析 Q1 与 Q8 是否一致，但不得把家长目标当作学生本人意愿。

## 四、动态问题：五个分支

Q1 决定主要分支。

最多追加4题。

已在基础题回答的信息不得重复询问。

### Branch A｜Pathway Exploration

触发：Q1 = PATHWAY_UNCLEAR

Q9：目前最不确定哪件事？
- 课程体系
- 选科
- 升学地区
- 专业方向
- 大学选择
- 申请资格

字段：`pathway_uncertainty`

Q10：孩子目前是否已有比较明确的目标？
- 已有具体学校
- 已有专业方向
- 只有地区偏好
- 还没有明确目标

字段：`target_clarity`

Q11：家庭是否愿意比较不同课程和升学路线？
- 愿意比较
- 倾向现有路线
- 暂时不考虑改变

字段：`pathway_flexibility`

Q12：目前最希望先获得什么帮助？
- 升学路线比较
- 课程建议
- 专业探索
- 院校方向
- 时间规划

字段：`support_priority`

### Branch B｜Curriculum Choice

触发：Q1 = CURRICULUM_CHOICE

Q9：目前正在考虑哪些课程？
- DSE
- A-Level
- IB
- AP
- 内地普高
- 其他

字段：`curriculum_options`

Q10：选择课程时，家庭最看重什么？
- 大学选择
- 孩子学科优势
- 学习方式
- 升学地区
- 教育成本

字段：`curriculum_decision_factors`

Q11：孩子目前在哪些科目表现较好？
- 数学及数理
- 语言
- 人文
- 科学
- 多个领域
- 不确定

字段：`subject_interest_signals`

Q12：目前是否有转课程体系的计划？
- 已经确定
- 正在考虑
- 只是了解
- 暂时不考虑转轨

字段：`curriculum_transition_status`

### Branch C｜Hong Kong Admission

触发：Q1 = HK_ADMISSION_GOAL

Q9：孩子目前的申请身份属于哪一种？
- 香港永久居民
- 香港非永久居民
- 内地居民
- 其他
- 暂时不确定

字段：`applicant_identity_category_self_reported`

Q10：目前主要考虑哪种申请方式？
- JUPAS
- Non-JUPAS
- 内地招生
- 国际生申请
- 不了解

字段：`admission_route_preference`

Q11：目前有没有目标专业？
- 已有明确专业
- 已有学科方向
- 正在探索
- 还没有

字段：`major_target_clarity`

Q12：最希望优先解决什么？
- 入学资格
- 选科
- 成绩差距
- 院校选择
- 申请时间

字段：`hk_admission_support_priority`

身份只作为用户自述，不等于官方核验后的招生资格。

### Branch D｜Growth Exploration

触发：Q1 = GROWTH_EXPLORATION

Q9：孩子做什么事情时最容易投入？
- 解决问题
- 创造作品
- 表达交流
- 组织团队
- 研究探索
- 动手实践

字段：`engagement_behaviours`

Q10：有没有持续投入的真实经历？
- 项目
- 比赛
- 社团
- 作品
- 志愿服务
- 暂时没有

字段：`growth_evidence_types`

Q11：孩子更喜欢怎样的学习方式？
- 独立探索
- 团队合作
- 实践操作
- 阅读研究
- 结构化指导

字段：`learning_preferences`

Q12：家庭最希望进一步了解什么？
- 学科优势
- 兴趣方向
- 专业探索
- 学习方法
- 成长规划

字段：`growth_exploration_priority`

不得输出固定人格或天赋标签。

### Branch E｜Multi-region Planning

触发：Q1 = MULTI_REGION_PLANNING

Q9：家庭目前最倾向哪个地区？
- 香港
- 英国
- 美国
- 澳大利亚
- 加拿大
- 新加坡
- 中国内地
- 尚未决定

字段：`region_priority`

Q10：如果有多条可行路线，家庭更重视什么？
- 学校质量
- 专业方向
- 未来就业
- 教育费用
- 家庭生活安排

字段：`regional_decision_factors`

Q11：目前有哪些现实条件需要考虑？
- 课程体系
- 身份
- 预算
- 时间
- 家庭所在地
- 暂时不确定

字段：`family_planning_constraints`

Q12：希望何时开始下一步规划？
- 现在
- 半年内
- 一年内
- 两年后
- 尚未决定

字段：`planning_start_window`

## 五、工程字段字典与 Enum

下表代码与题面选项一一对应，顺序和文案以第三、四节为准。技术编码是为落实冻结规格新增的稳定键。Q1 使用原件已经明确的五个 Enum。答题角色与证据不从分支推断。

| 题号 | 选项代码，依原件顺序 | 主字段／消费规则 |
| --- | --- | --- |
| Q1 | `PATHWAY_UNCLEAR` · `CURRICULUM_CHOICE` · `HK_ADMISSION_GOAL` · `GROWTH_EXPLORATION` · `MULTI_REGION_PLANNING` | `primary_concern` · R003、R011 |
| Q2 | `SECONDARY_FORM_1_YEAR_7` · `SECONDARY_FORM_2_YEAR_8` · `SECONDARY_FORM_3_YEAR_9` · `SECONDARY_FORM_4_YEAR_10` · `SECONDARY_FORM_5_YEAR_11` · `SECONDARY_FORM_6_YEAR_12` · `OTHER_SECONDARY` | `grade_level_raw` · R001 |
| Q3 | `DSE` · `IGCSE_A_LEVEL` · `IB` · `AP_US` · `GAOKAO` · `OTHER_INTERNATIONAL` · `UNDECIDED` | `education_system` · R002、R009 |
| Q4 | `STABLE_CLEAR_GOALS` · `GOOD_INTEREST_UNCLEAR` · `INTEREST_UNSTABLE_RESULTS` · `SUBJECT_VARIANCE` · `NEEDS_EXTERNAL_STRUCTURE` · `UNKNOWN` | `learning_state_self_reported` · R004 |
| Q5 | `STEM_TECH` · `BUSINESS_FINANCE` · `LANGUAGE_EXPRESSION` · `CREATIVE_ARTS` · `HEALTH_LIFE_SCIENCE` · `SPORT_LEADERSHIP_SOCIAL` · `PRACTICAL_PROBLEM_SOLVING` · `BROAD_INTERESTS` · `UNKNOWN` | `interest_domains[]` · R005、R006 |
| Q6 | `HK` · `GB` · `US` · `AU` · `CA` · `SG` · `CN_MAINLAND` · `UNDECIDED` | `preferred_regions[]` · R007、R010、R012 |
| Q7 | `STABLE_ALL_SUBJECTS` · `SUBJECT_STRENGTHS` · `SUBJECT_GAPS` · `VOLATILE_RESULTS` · `CURRICULUM_ADJUSTMENT` · `UNKNOWN` | `academic_self_report` · R006、R008 |
| Q8 | `UNIVERSITY_AND_MAJOR_FIT` · `BETTER_CURRICULUM` · `HK_UNIVERSITY_GOAL` · `DEVELOP_GROWTH_STRENGTHS` · `ACADEMIC_EFFICIENCY` · `HK_OR_OVERSEAS_PLANNING` · `UNDECIDED` | `family_goal` · R010、R011 |
| Q9.A | `CURRICULUM` · `SUBJECTS` · `REGION` · `MAJOR` · `UNIVERSITY` · `ELIGIBILITY` | `pathway_uncertainty` · R003、R012 |
| Q10.A | `SCHOOL` · `MAJOR` · `REGION_ONLY` · `NO_CLEAR_TARGET` | `target_clarity` · R006、R010 |
| Q11.A | `WILL_COMPARE` · `PREFER_CURRENT` · `NO_CHANGE_PLANNED` | `pathway_flexibility` · R009 |
| Q12.A | `COMPARE_PATHWAYS` · `CURRICULUM_ADVICE` · `MAJOR_EXPLORATION` · `UNIVERSITY_DIRECTION` · `TIMELINE` | `support_priority` · R010 |
| Q9.B | `DSE` · `A_LEVEL` · `IB` · `AP_US` · `GAOKAO` · `OTHER` | `curriculum_options` · R002、R009 |
| Q10.B | `UNIVERSITY_OPTIONS` · `SUBJECT_STRENGTHS` · `LEARNING_STYLE` · `STUDY_REGION` · `EDUCATION_COST` | `curriculum_decision_factors` · R009 |
| Q11.B | `MATH_QUANTITATIVE` · `LANGUAGES` · `HUMANITIES` · `SCIENCE` · `MULTIPLE_DOMAINS` · `UNKNOWN` | `subject_interest_signals` · R005、R008。记录自述的科目表现线索，尚不能推断兴趣。 |
| Q12.B | `DECIDED` · `CONSIDERING` · `EXPLORING_ONLY` · `NO_TRANSITION_PLANNED` | `curriculum_transition_status` · R009、R010 |
| Q9.C | `HK_PERMANENT` · `HK_NON_PERMANENT` · `CN_MAINLAND_RESIDENT` · `OTHER` · `UNKNOWN` | `applicant_identity_category_self_reported` · R006、R012 |
| Q10.C | `JUPAS` · `NON_JUPAS` · `MAINLAND_ADMISSIONS` · `INTERNATIONAL_ADMISSIONS` · `UNKNOWN` | `admission_route_preference` · R003、R012 |
| Q11.C | `SPECIFIC_MAJOR` · `SUBJECT_DIRECTION` · `EXPLORING` · `NONE_YET` | `major_target_clarity` · R006、R010 |
| Q12.C | `ELIGIBILITY` · `SUBJECT_SELECTION` · `ACADEMIC_GAP` · `UNIVERSITY_SELECTION` · `APPLICATION_TIMING` | `hk_admission_support_priority` · R008、R010、R012 |
| Q9.D | `SOLVING_PROBLEMS` · `CREATING_WORK` · `COMMUNICATING` · `LEADING_TEAMS` · `RESEARCH_EXPLORATION` · `HANDS_ON` | `engagement_behaviours` · R005 |
| Q10.D | `PROJECT` · `COMPETITION` · `CLUB` · `CREATIVE_WORK` · `VOLUNTEERING` · `NONE_YET` | `growth_evidence_types` · R005、R006 |
| Q11.D | `INDEPENDENT_EXPLORATION` · `TEAMWORK` · `HANDS_ON_PRACTICE` · `READING_RESEARCH` · `STRUCTURED_GUIDANCE` | `learning_preferences` · R004、R005 |
| Q12.D | `SUBJECT_STRENGTHS` · `INTEREST_DIRECTION` · `MAJOR_EXPLORATION` · `LEARNING_METHODS` · `GROWTH_PLANNING` | `growth_exploration_priority` · R005、R010 |
| Q9.E | `HK` · `GB` · `US` · `AU` · `CA` · `SG` · `CN_MAINLAND` · `UNDECIDED` | `region_priority` · R007、R012 |
| Q10.E | `SCHOOL_QUALITY` · `MAJOR_DIRECTION` · `EMPLOYMENT` · `EDUCATION_COST` · `FAMILY_ARRANGEMENTS` | `regional_decision_factors` · R007、R010 |
| Q11.E | `CURRICULUM` · `IDENTITY` · `BUDGET` · `TIME` · `FAMILY_LOCATION` · `UNKNOWN` | `family_planning_constraints` · R006、R007、R010 |
| Q12.E | `NOW` · `WITHIN_SIX_MONTHS` · `WITHIN_ONE_YEAR` · `AFTER_TWO_YEARS` · `UNDECIDED` | `planning_start_window` · R010 |

`Q1` 单选，作为正式分支的必要前提。Q5 多选，Q6 最多两项。Q2–Q4、Q7–Q8 和动态题的最终选取基数、跳过矩阵及互斥见第十二节；明确单值语义的字段始终只接收单值。未批准的基数与跳过组合不应由任一端自行配置。对允许多选的题，去重且规范化为冻结选项顺序，除非确有独立优先级证据。原件的未知、未定和暂时没有保留为不同的合法响应，不能互相替换。

| 画像域 | 字段、类型与来源 | 默认及推导边界 |
| --- | --- | --- |
| Concern | `primary_concern` 为 Q1 的 Enum | 仅分流和需求表达。与 CRM 接收相互独立。 |
| Education Stage | Q2 `education_stage` 为阶段码，`grade_level_raw` 为源选项代码及版本，`grade_label` 为原冻结标签，`grade_system` 为显式体系码 | 此题只落 `SECONDARY` 和原复合标签。问卷未明确对应实际学校体系时 `grade_system = null`，不建立跨国年级换算。 |
| Curriculum Profile | Q3 `education_system`，可空 `curriculum_stage`、`curriculum_subjects[]`、`curriculum_transition_status`，B 分支另存备选、因素及自述科目线索 | `IGCSE_A_LEVEL` 保留组合，细分阶段、科目、转轨需确切回答。B12 提供转轨事实的自述指引。 |
| Learning State | Q4 `learning_state_self_reported`，D11 的 `learning_preferences` | `PARENT_GUARDIAN`、`STUDENT` 与未声明各自带来源。家长填答保留家长观察。 |
| Growth Signals | Q5 `interest_domains[]`，可空 `engagement_evidence`、`engagement_duration`、`growth_evidence_types`，及 D 分支活动、投入、方式和进一步探索项 | 兴趣类别不产生持续实践事实。D10 或经核准的明确补充可记录经历类别。没有持续时间时保留缺项；不给天赋分。 |
| Pathway Preferences | Q6 `preferred_regions[]`、`primary_preferred_region`、`region_decision_status`，A/B/C/E 的目标、路线、优先项、条件、时点 | `region_priority` 可在最优先地区明示后映射到 `primary_preferred_region`。两项并列时不得从点击顺序推断排名。不能根据地区偏好推定入学资格。 |
| Academic Self Report | Q7 `academic_self_report`、`academic_period`、`result_type`、`result_source`、`verification_status` | Q7 是定性自报，`result_type = QUALITATIVE_SELF_REPORT`，来源绑定角色，`verification_status = UNVERIFIED`。时期未填为空。可选具体成绩须保留考试体系、学科、时期、原量表和证据。 |
| Family Goals | Q8 `family_goal`、`family_goal_priority`、`family_goal_time_horizon`、`goal_alignment_status` | `family_goal_time_horizon` 来自题面的三年。仅记录明确选出的目标和优先级。Q1/Q8 对照只提示当前关注与家庭目标是否同向；学生意愿另采。 |
| Information Completeness | 路由与响应状态集合 `presented_question_ids`、`missing_fields`、`skipped_question_ids`、`not_presented_question_ids` | 未出现问题不计缺答。缺项与不确定分别表达。完整度只描述证据覆盖，不用旧付费完整度打分。 |

每条 Question Response 包含 `response_id, question_id, question_slot, question_version, branch_version, field_key, normalized_value, response_status, respondent_role, respondent_role_basis, answered_at, revision`。受权记录另绑定现有 Assessment 与服务端核实的身份。匿名会话中角色来自填答者声明或 `UNDECLARED`，不据此授予家庭访问权限；已有 verified role 也不提高答案事实等级。输入只接收注册表允许的代码和结构，拒绝额外字段及不可达变体。

## 六、分支、回改与跳题

1. `PATHWAY_UNCLEAR → A`、`CURRICULUM_CHOICE → B`、`HK_ADMISSION_GOAL → C`、`GROWTH_EXPLORATION → D`、`MULTI_REGION_PLANNING → E`。每个分支按 Q9、Q10、Q11、Q12 顺序，过滤已回答的同义且兼容字段。没有 Q1 时可保留基础题草稿，动态题保持未出现。
2. 只有明确、当前、适用且同字段语义和枚举的回答可以复用。例：Q6 只记录两个地区偏好，E9 仍需明确优先选项。Q3 只选择当前课程，B12 仍需问转轨状态。Q5 仅选择兴趣，D10 仍需问实践经历。若已从可复用响应明确取得相同字段，跳题保留原证据引用及 `SKIPPED_DUPLICATE` 原因。
3. 变更答案时按固定版本重算。修改 Q1 后仅当前分支的可达回答进入快照。原分支中语义一致、答题者一致且符合新题验证的回答可附原引用复用；引用不可跨评估或角色进行隐式继承。旧分支独有回答退出活跃集合，不进入新分析或 CRM。进度以当前实际可达题数计算。
4. 区分 `ANSWERED`、`USER_SKIPPED`、`NOT_PRESENTED`、`MISSING` 及 `SKIPPED_DUPLICATE`。不确定属于 ANSWERED。必答缺失时不得生成完整提交，允许跳过的题列入缺失信息或跳过原因。未回答信息由规则保持缺失。AI 无法写补齐字段。
5. 动态题至多显示 4 道，服务端在保存/提交时重新验证路径与上限。Q5 关于持续实践的取证要求保留；D10 已取得同一事实时不重复问。该补问如采用独立响应位，计入同一题数上限。D 分支之外的补问形式待 Founder 定稿，规格不新增 Q13。

## 七、证据等级与 EDU-R001–R012

| 等级 | 用途 | 输出限制 |
| --- | --- | --- |
| L1 · Direct Fact | 用户直接选择或叙述的内容，绑定填答者和响应版本 | 明示自述或家长观察，可复述事实声明，不视为外部核验。 |
| L2 · Supported Observation | 至少两个有独立内容的有效回答共同支持观察 | 保存各自引用。若旁证冲突，记录差异与缺项，不用重复响应抬高证据。 |
| L3 · Professional Assessment Required | 自报不足以完成定性判断，需成绩单、文件或专业评估 | 输出待核验和下一步，记录已可追溯支持及缺什么。 |
| L4 · Official Rule Verified | 规则有官方来源，精确适用且通过有效期、范围和冲突检查 | 只陈述已核验条款及可验证适用性。资格级结论还需已核验申请人条件。 |

下列均属于 `edu-free-rules.v1.0`，先执行规则后渲染。规则的样例为实施验收输入，不代表应用已执行相应路径。

| 规则 | 输入与触发 | 允许输出、证据等级及引用 | 禁止输出；缺项／核验 | 验收样例 |
| --- | --- | --- | --- | --- |
| EDU-R001 · Stage Recognition | Q2 明确的阶段/原年级码 | 卡 1 的阶段与原标签，L1，引用 Q2 | 不推年龄或转换年级；未知体系留空 | 中三 / Year 9 保留原标签及未知实际体系 |
| EDU-R002 · Curriculum Recognition | Q3 已填，B9 可补候选体系 | 卡 1 的现行体系、卡 3 的备选，L1，引用各自输入 | 不从当前体系推课程阶段、科目或资格；未定保留 | Q3 呈组合 IGCSE / A-Level，B9 的 IB 标为备选 |
| EDU-R003 · Concern Recognition | Q1 已填，A9、C10 可细化 | 卡 3 的当前困惑和探索方向，L1；引用对应字段 | 不推已选学校、报名路径或有意购买；缺 Q1 无分支 | Q1 为香港申请，C10 不了解，保留申请方式待确认 |
| EDU-R004 · Learning State Observation | Q4 一条有效状态可复述，Q4 与 D11 的独立一致输入可描述观察 | 卡 2 的学习状态或方式，L1 或 L2，引用一条或多条来源 | 不诊断，不把家长观察变成学生确认；缺项列待确认 | 家长报告被动与学生独立探索并存，按来源呈现差异 |
| EDU-R005 · Interest Signal Mapping | Q5 兴趣及 D9–D11 的具体投入线索 | 卡 2 的兴趣/投入线索，有独立吻合证据才用 L2 | 不叫作固定人格或天赋；经历时长未知就列缺项 | 科技兴趣＋自报持续项目只提示进一步了解相关投入 |
| EDU-R006 · Evidence Completeness | 从可达响应、目标清晰度与专业核验需要判断缺项 | 卡 4 的待补信息，必要时 L3，引用已有响应与所需材料 | 不把未显示题计缺，不输出分数或猜填未知 | 进入 C 分支、身份未定时提示核实身份，E 分支未问项排除 |
| EDU-R007 · Region Preference Mapping | Q6 与 E9–E11 给出地区及约束 | 卡 3 的地区偏好与已明示优先项，L1，引用地区和因素 | 不自动给优先顺位或资格判断；未定保留比较空间 | 香港与英国两项并列，无 E9 时无第一优先 |
| EDU-R008 · Academic Information Mapping | Q7 或已明确的可选学科成绩、自报科目表现 | 卡 2 的定性自报，L1；对成绩差距未获验证提示 L3 | 禁止跨体系换算或把自报入学术档案。时期、量表缺则标缺 | Q7 各科波动与 C12 成绩差距，提示核对具体时期与资料 |
| EDU-R009 · Curriculum Goal Alignment | Q3、Q8、A11/B9–B12 的选择与考量 | 卡 3 的路线比较维度。事实声明 L1，有独立支持可用 L2 | 不给最终转轨结论；制度条件走 R012；缺备选则先了解 | 现读 DSE、考虑 IB、目标选课时提示比较科目与要求 |
| EDU-R010 · Planning Time Priority | E12 明示时点；其余路径可据 A12/C12/D12 或 Q8 给下一步 | 卡 4 的明确行动及自报时间优先级，引用输入，L1 或 L3 | 无时点不造期限。正式截止日期受 R012 约束 | E12 未定给梳理建议；半年内为偏好，无官方 deadline |
| EDU-R011 · Family Goal Alignment | Q1 当前关注及 Q8 三年家庭目标同时明确 | 卡 3 的同向或待沟通，引用两题，适用时 L2 | 不能把家庭目标当成学生目标；非同一主题不判家庭冲突 | Q1 课程选择＋Q8 选择更合适体系，同方向；缺任何一题时待确认 |
| EDU-R012 · Official Rule Gate | 拟套用入学资格、考试条件或正式日期，需要规则 scope 和申请人事实 | 卡 3 的官方条款引用 L4，或卡 4 的待核查提示 L3 | 过期、冲突、未核验或主体条件不足时禁止确定性判断。任何情况下禁止录取概率、保证录取和专业排名 | 同一年度适用规则 VERIFIED 且条件均证实才允许适用性判断；过期、不同年度、仅身份自报均拒绝 |

## 八、Official Rule Verification Registry

| 字段 | 定义 |
| --- | --- |
| `rule_id`、`rule_category`、`rule_revision` | 稳定规则事实键、类别、追加版本及被替代引用 |
| `jurisdiction`、`institution`、`programme` | 精确适用法域及院校/专业。院校或专业尚未确认视为缺项。官方条款无须标到校或专业时，由审阅人明确适用粒度。 |
| `admission_year`、`qualification_system` | 目标入学年与课程/资历体系。依据条款列出申请条件与需要核实的申请人事实。 |
| `source_url`、`source_published_at` | 可信官方发布者、原文、发布日期、版本/内容 SHA-256 及原文定位。发布日期不作为目标入学年。 |
| `valid_from`、`valid_until` | 有效窗为 UTC 的 `[valid_from, valid_until)`。没有可核对的有效条件时进入审阅，历史/未来版本不参与当前推断。 |
| `verified_at`、`reviewed_by` | 经授权的 Canonical Principal、核验时间与审核记录。记录撤销和替代理由，保留历史。 |
| `verification_status` | `VERIFIED`、`EXPIRED`、`UNVERIFIED`、`CONFLICTED`。无法找到对应条款的判定为 `UNVERIFIED` 并给缺项。 |

按规则类别、法域、适用院校/专业、入学年和资历体系匹配。核验时间、条件和有效窗全部满足才可以引用唯一结论。多个有效来源出现有实质冲突的内容时标 `CONFLICTED`，须由授权审核人确认有效替代版本。身份、成绩与申请条件单独核验；即便条款已是 VERIFIED，申请人仅有自报时仍只给核对提示。禁止用往年数据代替当前年度。

复用 `education.institution` 和 `education.program`（0019）的键与版本。正式 `education.external_facts`（0004）记载申请回执及决定，有申请外键。Rule Verification Registry 暂为治理契约；公开来源可通过官方 URI 与版本/摘要登记。有权使用的私有证明引用 `docs.document_versions.version_id` 的确切版本（0005），保留文件授权范围。 [Canonical 迁移树](https://github.com/yvettfang-netizen/phoenix/tree/e5d72abfda656da695cc05e90054d90632353c89/database/canonical/migrations)

## 九、Instant Growth Snapshot

| 固定卡片 | 允许呈现 |
| --- | --- |
| 1. Education Stage | 已报告阶段与现行课程体系，并显示未知项 |
| 2. Growth Signals | 可追溯学习状态、兴趣/实践、学术自报与观察 |
| 3. Pathway Exploration | 家庭偏好、课程探索与已核验条款的最小引用 |
| 4. Next Best Step | 有证据的建议、缺项、需专业/官方确认的事项 |

每条 Finding 持有 `finding_id, finding_type, title, summary, evidence_refs[], evidence_level, missing_information[], official_verification_required, official_verification_status, rule_id, rule_version, recommended_next_actions[]`。 `evidence_refs` 必须可解析到 Question Response 或核验记录，分别附字段、角色或审核版本；标题与文字不参与 ID 运算。稳定 ID 以评估版本、规则、Finding 类型与证据键生成。无需官方核验的 Finding 将 `official_verification_status` 留空，界面标识为“不适用”。缺乏有效响应的卡片可呈现缺项和最低要求，不能补造 Finding 来源。

规则先形成上述结构和审核结果，确定性模板即可即时渲染。LLM 如获准用于措辞，只表达已有 Finding，服务端固定证据、等级、规则版本、权限和动作。不能扩写百分比、排名、天赋评分、录取概率或保证录取。越出允许范围时用确定性模板。付费六模块报告及其权限和价格继续使用现有权威。

## 十、Canonical、CRM 与 Jimson 工程复用

| 场景 | 复用和接入条件 |
| --- | --- |
| 匿名完成 | 用临时上下文即时计算，默认无持久身份绑定和联系人写入。查看结果、结果保存、联系、分享与学生参与为独立事实。在实际保留/删除审批前不持久化匿名原答或关联行为。 |
| 已辨明身份的评估 | 使用 Phoenix Core 的 Person、Student、Family、Principal 和既有 Family OS 授权。#74 的 `questionnaire_bank`、`assessment`、`purpose_evidence` 已提供版本、提交与关系。候选的 Family、Student、Respondent、监护证据为必需，匿名即看不应写这些行。用户保存并进行受保护流程时需正确核实身份、对象、用途及 Consent／适用 Assent。 |
| 主动联系 | 匿名查看不创建可联系 Lead。提交明确联系同意后才使用合法来源及受控咨询接收器，联系信息与评估分享授权分开。撤回阻止后续不再授权的联系或分享。禁止邮箱相同即自动合并 Client 或学生。 |
| 归因、需求与评估引用 | 复用 #116 来源与归因契约、`crm.lead_events` 及 `crm.assert_lead_need()`。正式 DDL 无 `crm.lead_need_facts` 物理表。First Touch 保持不变。官网使用批准的对应来源和路径，微信入口按受控来源登记。幂等按来源及事件载荷，失败重放不能重复建 Lead 或绑定评估。受控原生评估分享仍需独立授权、同家核验及来源服务权限。 |
| 原生小程序及服务端 | 沿用 Jimson 的页面壳、版本化题库/校验、回改基础、结果 UI、服务端规则及构建工具。8+4 采用新的 free 题库版本，开启匿名及四卡路径。原 23 题、六模块报告、¥39.90 订单、PDF 与支付适配器继续从原权威生产。 |
| 教育生态 | 凤启学苑｜Phoenix Academic Studio 负责真人教学及专业服务。问思｜ASKWISE 支持具体学科学习，沿用原有引擎。CRM 为 Corporate OS 内的客户经营模块。家庭服务入口保持 Canonical 受权投影。 |

[原生评估 #74 固定源码](https://github.com/yvettfang-netizen/phoenix/commit/1366b53f662082098c2f2673e9ee4be6f433b261) · [CRM #116 固定源码](https://github.com/yvettfang-netizen/phoenix/commit/3ae183fdc0dab0d26863a2ee7bf09fa801e81e51) · [Jimson 客户端/服务端源码](https://github.com/yvettfang-netizen/phoenix/tree/e5d72abfda656da695cc05e90054d90632353c89/Phoenix%20Compass/education%20compass)

官网与微信共用同版 Question Registry、Enum、Branch Rules、EDU Rules、Official Rule Registry 和 Snapshot Contract。两端 UI 可异，输入同版本/证据/核验时点必须得出相同的结构化字段、分支、证据和结果。上线前校验版本及摘要，黄金样例跨端比对。用户从匿名进入授权区域时需独立校验，避免浏览器草稿自行关联 Canonical Family 或 CRM。

## 十一、P0 验收清单

| 编号 | 必须核验的行为 | 预期 |
| --- | --- | --- |
| T01 | Q1–Q8 全部合法代码及 20 个动态变体 | 题文、选项顺序与字段符合本文件；未知 Enum、重复代码及越界基数拒绝 |
| T02 | 逐个选择 Q1 五个值 | 仅出现匹配的 A/B/C/D/E 和最多四个可达变体 |
| T03 | 重复字段与不足证据 | 确实同义且有效的答案跳过并保留原证据；Q3 只具当前课程时仍出现 B12 |
| T04 | 修改 Q1、回退重答 Q2/Q6 | 重算路径和进度；复用真正等价字段，未激活变体不进入分析 |
| T05 | 必答缺失、非必要跳过、合法不确定 | 各自状态保留，AI 不补空，超 12 题或独立 Q13 拒绝 |
| T06 | 家长与学生填答 | 角色与证据来源始终区分，家长自报不升级 |
| T07 | L1–L4 与追溯 | 各 Finding 有有效证据引用；L2 需多个独立支持；L3 明示待核；L4 需合格规则来源 |
| T08 | 缺规则、过期、冲突、不同年度和主体条件未经核实 | 不给确定性招生判断；同范围正式规则及申请人条件核实后才走受限许可 |
| T09 | Instant 四卡 | 不依赖 LLM 即可渲染四卡；超范围模型内容退回模板 |
| T10 | 匿名、明确与未明确联系同意 | 可匿名看结果；未明示同意，无可联系 Lead；有明确同意只接最少必要资料 |
| T11 | 保存、分享、学生参与授权及撤回 | 独立检查用途，撤回使后续不再授权的操作失败，事件重试无重复 |
| T12 | 官网与微信相同输入、版本、官方规则时点 | 两端字段、路由、证据及快照一致，版本漂移拒绝 |

本轮验收为规格稿静态核对，涵盖冻结题文/选项保真、编码数量、五分支、规则登记与文件范围。上表应用与联合验收留待实现审批。

## 十二、Founder 实施前确认

1. 核定 Q2–Q8 和 20 个动态变体的必答/非必要逐题标记，以及未明确的多选题、每题上限和不确定项互斥方式。Q1 的单一分流、Q5 多选、Q6 最多两项已经确定。
2. 核定 Q5 持续项目/比赛/作品/实践补问的呈现、独立响应是否占动态题及其多分支去重顺序。需保持 8+4 与总上限不变。
3. 核定匿名暂存/删除、保存、联系、分享、学生 Consent/Assent 的文字与保留策略，及官网/微信各自的来源合同注册。授权记录与事实录入各自审批。
4. 确认官方来源维护人与复核流程，安排精确招生规则证据与版本。后续技术审核应确认 Canonical 前向接入方式、双端制品和验收安排。

本规格的技术选项需在实施审查中确认。已有题面、分流、证据等级、产品资产边界及固定四卡遵循 Founder 原件。

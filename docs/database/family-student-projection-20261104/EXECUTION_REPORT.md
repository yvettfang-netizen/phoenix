# Family / Student 最小只读投影交付

2026-11-04，Jimson本人授权及回写，Codex执行。**开发／合成投影 PASS；真实身份及正式启用 HOLD。**

已增加家庭摘要、学生列表与单个学生的受控读取：实际查询Canonical；分离binder/read LOGIN，一次性票据绑定到读取连接；业务读取事务只读，结束后clear/reset/discard。网页BFF和隔离预览页仅在本地开发开关下启用，不切换既有Family OS或旧Store。详情见[精确字段与权限契约](API_CONTRACT.md)和[实际验收](TEST_REPORT.md)。

本候选基于PR45的307ab74350eb5e9d745fe37c55e0a8033ed1dff0，作为独立后续分支审查；PR45尚未合并，main仍以9355d28667ee9cf4761b4abcdaf959f0ad154820的0035为基线。没有合并、部署、新Migration或历史SQL修改。新测试仅在一次性合成集群创建fixture与运行角色，业务主表不在应用运行时创建/写入。

学生预览保守限定本人或现有EDUCATION／GENERAL有效核验监护范围；家庭成员身份不自动开放其他学生字段。现有Consent／监护／ID决策不扩权。返回UUID仅作合成候选的内部不透明定位符，不宣称公共ID转换已完成。

仍HOLD：真实issuer/audience/JWKS、实际客户/员工身份与source-qualified映射证据、正式公开ID契约、受保护运行账号及密钥引用、持久且受控的数据库读取决策审计、敏感字段及真实应用切换。应用层仅输出无身份/正文的授权结果元数据，不冒充新增数据库audit能力。未导入真实资料、未接腾讯、未部署或代签合并。

唯一下一工程动作：整理并审查正式读取决策审计与公开ID翻译的窄Forward候选、实际身份接入事实表；缺证继续默认拒绝真实启用。真实Family/Student接入和生产保持HOLD，不能由本轮合成PASS推导。

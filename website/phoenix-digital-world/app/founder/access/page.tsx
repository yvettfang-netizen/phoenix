import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import styles from "../../world/world.module.css";

export default function FounderAccessBoundary() {
  return (
    <main className={styles.accessPage}>
      <Link className={styles.accessBack} href="/fenghuang-xingtu">
        <ArrowLeft aria-hidden="true" />
        返回凤凰星图
      </Link>
      <section className={styles.accessCard} aria-labelledby="access-title">
        <span className={styles.accessMark}><LockKeyhole aria-hidden="true" /></span>
        <small>SYSTEM CORE · FOUNDER MODE</small>
        <h1 id="access-title">凤凰中枢</h1>
        <strong>PHOENIX CORE · AUTHORIZED ACCESS</strong>
        <p>这里是凤启的系统中枢，不属于三重世界。普通访客可以看见它的存在，但内部 Dashboard、任务、员工、学生与项目数据仅向已授权身份开放。</p>
        <Link href="/fenghuang-xingtu">返回凤凰星图</Link>
      </section>
    </main>
  );
}

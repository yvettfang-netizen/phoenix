import Link from "next/link";

const links = [
  { href: "/", label: "Today" },
  { href: "/student-task", label: "Student Task" },
  { href: "/evidence", label: "Learning Evidence" },
  { href: "/maps/political", label: "Political Map" },
  { href: "/maps/math", label: "Math Map" },
  { href: "/reflection", label: "Reflection" },
  { href: "/dashboard", label: "Growth Dashboard" },
];

export default function TopNav() {
  return (
    <nav className="top-nav">
      {links.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

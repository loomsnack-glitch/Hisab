export interface TeamMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  tel: string;
  avatar: string | null;
  initials: string;
  status: string;
  accent: "blue" | "cyan" | "blend";
  cardVariant?: "dark" | "white" | "auto";
}

export const SUPPORT_TEAM: TeamMember[] = [
  {
    id: "dev-jariwala",
    name: "Dev Jariwala",
    role: "Founder & CEO",
    phone: "+91 79901 76865",
    tel: "+917990176865",
    avatar: "/images/team/dev-jariwala.png",
    initials: "DJ",
    status: "Available to Help",
    accent: "blue",
    cardVariant: "auto",
  },
  {
    id: "shubham-prajapati",
    name: "Shubham Prajapati",
    role: "Product Manager",
    phone: "+91 76218 54054",
    tel: "+917621854054",
    avatar: "/images/team/shubham-prajapati.png",
    initials: "SP",
    status: "Available to Help",
    accent: "blend",
    cardVariant: "auto",
  },
  {
    id: "himank-khaptawala",
    name: "Himank Khaptawala",
    role: "Frontend Developer",
    phone: "+91 95379 53709",
    tel: "+919537953709",
    avatar: "/images/team/himank-khaptawala.png",
    initials: "HK",
    status: "Available to Help",
    accent: "cyan",
    cardVariant: "auto",
  },
];

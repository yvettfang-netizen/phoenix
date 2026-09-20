"use client";
import {createContext, useContext, useState, type ReactNode} from "react";
import {initialDocuments, upsertDemoApplication, type DemoDocument, type ApplicationRecord, type Goal, type HubView} from "@/lib/family-demo";

type Learning = {added: boolean; confirmed: boolean; report: boolean; handoff: "academy" | "askwise" | null};
type Demo = {
  memberId: string; setMemberId: (id: string) => void;
  goal: Goal; setGoal: (goal: Goal) => void;
  view: HubView; setView: (view: HubView) => void;
  documents: DemoDocument[]; setDocuments: (fn: (docs: DemoDocument[]) => DemoDocument[]) => void;
  applications: ApplicationRecord[];
  submitApplication: (record: Omit<ApplicationRecord,"id">) => void;
  withdrawApplication: (id: string) => void;
  learning: Record<string, Learning>; updateLearning: (id: string, values: Partial<Learning>) => void;
  emailOn: boolean; setEmailOn: (on: boolean) => void;
};
const Context = createContext<Demo | null>(null);
export function FamilyDemoProvider({children}: {children: ReactNode}) {
  const [memberId, setMemberId] = useState("demo-xiao");
  const [goal,setGoal] = useState<Goal>("masters");
  const [view,setView] = useState<HubView>("overview");
  const [documents,setDocuments] = useState(initialDocuments);
  const [applications,setApplications] = useState<ApplicationRecord[]>([]);
  const [learning,setLearning] = useState<Record<string, Learning>>({});
  const [emailOn,setEmailOn] = useState(false);
  return <Context.Provider value={{memberId,setMemberId,goal,setGoal,view,setView,documents,setDocuments,applications,
    submitApplication: record => setApplications(old => upsertDemoApplication(old,record)),
    withdrawApplication: id => setApplications(old => old.map(x => x.id === id ? {...x,status:"withdrawn",consent:false} : x)),
    learning, updateLearning: (id,values) => setLearning(old => ({...old,[id]:{...(old[id]??{added:false,confirmed:false,report:false,handoff:null}),...values}})),
    emailOn,setEmailOn}}>{children}</Context.Provider>;
}
export function useFamilyDemo() {
  const value = useContext(Context);
  if (!value) throw new Error("FamilyDemoProvider is required");
  return value;
}

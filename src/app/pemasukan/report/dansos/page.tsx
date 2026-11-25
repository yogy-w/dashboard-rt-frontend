"use client";
import ReportMatrix from "../../../../components/ReportMatrix";
import { getReportDansos } from "../../../../lib/rt-api";
export default function Page() { return <ReportMatrix title="Report Dansos" description="Pemantauan pembayaran dana sosial bulanan. Hanya warga dengan status Dansos AKTIF yang ditampilkan." loader={getReportDansos} />; }

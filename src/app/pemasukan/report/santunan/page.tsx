"use client";
import ReportMatrix from "../../../../components/ReportMatrix";
import { getReportSantunan } from "../../../../lib/rt-api";
export default function Page() { return <ReportMatrix title="Report Santunan" description="Pemantauan pembayaran santunan berdasarkan Master Santunan dan tanggal pelaksanaan." loader={getReportSantunan} />; }

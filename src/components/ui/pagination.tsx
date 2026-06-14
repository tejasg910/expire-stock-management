import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  baseUrl: string; // e.g. "/my-pickups" or "/provider/dashboard"
  paramName?: string;
}

export function Pagination({ page, totalPages, baseUrl, paramName = "page" }: Props) {
  if (totalPages <= 1) return null;

  function href(p: number) {
    return `${baseUrl}?${paramName}=${p}`;
  }

  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-sm text-gray-400">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={14} />
            Prev
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-100 text-gray-300 cursor-not-allowed">
            <ChevronLeft size={14} />
            Prev
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={href(page + 1)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Next
            <ChevronRight size={14} />
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-100 text-gray-300 cursor-not-allowed">
            Next
            <ChevronRight size={14} />
          </span>
        )}
      </div>
    </div>
  );
}

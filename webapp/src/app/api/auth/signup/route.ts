import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: "メールアドレスとパスワードは必須です" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user (will throw on duplicate email due to unique constraint)
    const newUser = await queryOne<{ id: string }>(
      "INSERT INTO users (email, password_hash, provider) VALUES ($1, $2, 'email') RETURNING id",
      [email.toLowerCase().trim(), passwordHash]
    );

    if (!newUser) {
      return NextResponse.json(
        { error: "ユーザーの作成に失敗しました" },
        { status: 500 }
      );
    }

    // Create profile row
    await query(
      "INSERT INTO profiles (id, email) VALUES ($1, $2)",
      [newUser.id, email.toLowerCase().trim()]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    // PostgreSQL unique violation: error code 23505
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }

    console.error("[signup] unexpected error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
